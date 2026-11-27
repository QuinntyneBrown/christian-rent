import { TestBed } from '@angular/core/testing';
import {
  CHURCH_VERIFICATION_API,
  REVIEW_QUEUE_API,
  type ApiError,
  type ReviewDecided,
  type ReviewDecision,
  type ReviewArrivals,
  type ReviewItemDetail,
  type ReviewItemSummary,
  type ReviewQueuePage,
} from '@rent/api';
import {
  ARRIVALS_MS,
  PAGE_SIZE,
  ReviewQueueStore,
  SKELETON_DELAY_MS,
  WINDOW_PAGES,
} from './review-queue-store';
import { ToastQueue } from './toast-queue';

/** A request the test answers, with the signal it was given. */
interface Asked<T> {
  readonly about: string | null;
  readonly signal: AbortSignal;
  answer(value: T): Promise<void>;
  refuse(code: string, more?: Partial<ApiError>): Promise<void>;
}

export function fakeApi() {
  const pages: Asked<ReviewQueuePage>[] = [];
  const items: Asked<ReviewItemDetail>[] = [];
  const decisions: Asked<ReviewDecided>[] = [];
  const arrivals: Asked<ReviewArrivals>[] = [];
  const churches: Asked<void>[] = [];
  const ask = <T>(into: Asked<T>[], about: string | null, signal: AbortSignal) =>
    new Promise<T>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      const settle = async () => {
        await vi.advanceTimersByTimeAsync(0);
      };
      into.push({
        about,
        signal,
        answer: (value) => {
          resolve(value);
          return settle();
        },
        refuse: (code, more) => {
          reject({ status: 0, code, retryAt: null, reportedAt: null, fields: null, ...more });
          return settle();
        },
      });
    });
  return {
    pages,
    items,
    decisions,
    arrivals,
    churches,
    churchApi: { verify: (id: string, signal: AbortSignal) => ask(churches, id, signal) },
    api: {
      arrivals: (since: string, signal: AbortSignal) => ask(arrivals, since, signal),
      page: (cursor: string | null, signal: AbortSignal) => ask(pages, cursor, signal),
      item: (id: string, signal: AbortSignal) => ask(items, id, signal),
      decide: (id: string, decision: ReviewDecision, version: number, signal: AbortSignal) =>
        ask(decisions, `${id} ${decision} ${version}`, signal),
    },
  };
}

export function row(id: string): ReviewItemSummary {
  return {
    id,
    kind: 'new-listing',
    title: `Listing ${id}`,
    who: 'Sarah Kim',
    waitingSince: '2026-06-08T16:00:00Z',
    offer: 'wanted',
    thumbUrl: null,
  };
}

export function page(
  ids: string[],
  nextCursor: string | null = null,
  waitingCount = ids.length,
): ReviewQueuePage {
  return { items: ids.map(row), nextCursor, waitingCount, asOf: '2026-06-08T19:00:00Z' };
}

/** A new member of St. Paul's, which no admin has confirmed unless `verified`. */
export function memberDetail(
  id: string,
  verified = false,
  churchId = 'st-pauls',
): ReviewItemDetail {
  return {
    ...detail(id),
    kind: 'new-member',
    listing: null,
    member: {
      name: `Member ${id}`,
      joinedAt: '2026-06-08T18:20:00Z',
      church: {
        id: churchId,
        name: 'St. Paul’s Anglican',
        city: 'Fort Langley',
        isVerified: verified,
        enteredBy: null,
      },
      listingCount: 0,
      forRentCount: 0,
      publicCount: 0,
      messageCount: 0,
    },
  };
}

export function detail(id: string): ReviewItemDetail {
  return {
    id,
    kind: 'new-listing',
    waitingSince: '2026-06-08T16:00:00Z',
    version: 0,
    allowedDecisions: ['approve', 'remove'],
    report: null,
    member: null,
    listing: {
      id: `listing-${id}`,
      offer: 'wanted',
      kind: 'thing',
      title: `Listing ${id}`,
      price: null,
      when: { text: 'Any time', start: null, end: null },
      area: 'Langley',
      note: null,
      photos: [],
      poster: {
        name: 'Sarah Kim',
        isVerified: false,
        joinedAt: '2026-01-05T17:00:00Z',
        church: { name: 'Grace Community Church', isVerified: true },
      },
      postedAt: '2026-06-08T16:00:00Z',
    },
  };
}

// view-review-queue design: the queue, its selection and the selected item's detail.
describe('ReviewQueueStore', () => {
  let fake: ReturnType<typeof fakeApi>;
  let store: ReviewQueueStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T19:00:00Z'));
    fake = fakeApi();
    TestBed.configureTestingModule({
      providers: [
        ReviewQueueStore,
        ToastQueue,
        { provide: REVIEW_QUEUE_API, useValue: fake.api },
        { provide: CHURCH_VERIFICATION_API, useValue: fake.churchApi },
      ],
    });
    store = TestBed.inject(ReviewQueueStore);
  });

  afterEach(() => vi.useRealTimers());

  async function loaded(ids = ['a', 'b'], wide = true): Promise<void> {
    store.showDetail(wide);
    void store.load();
    await fake.pages.at(-1)!.answer(page(ids));
  }

  it('shows a loading state only once the queue has been awaited for 300 ms', async () => {
    void store.load();
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS - 1);
    expect(store.skeleton()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(store.skeleton()).toBe(true);

    await fake.pages[0]!.answer(page(['a']));
    expect(store.skeleton()).toBe(false);
    expect(store.state()).toBe('loaded');
  });

  it('writes each row as of the time its page arrived', async () => {
    await loaded();

    expect(store.items().map((item) => item.meta)).toEqual([
      'Sarah Kim · 3 hr',
      'Sarah Kim · 3 hr',
    ]);
    expect(store.waitingCount()).toBe(2);
  });

  it('selects the first item and loads its detail where a detail panel is shown', async () => {
    await loaded();

    expect(store.selectedId()).toBe('a');
    expect(store.detailState()).toBe('loading');
    await fake.items[0]!.answer(detail('a'));

    expect(store.detailState()).toBe('loaded');
    expect(store.detail()).toMatchObject({ type: 'listing', title: 'Listing a' });
  });

  it('selects nothing and asks for no detail where there is no detail panel', async () => {
    await loaded(['a'], false);

    store.select('a');

    expect(store.selectedId()).toBeNull();
    expect(fake.items).toEqual([]);
  });

  it('aborts the detail on its way, and drops its selection, when the panel goes', async () => {
    await loaded();

    store.showDetail(false);

    expect(fake.items[0]!.signal.aborted).toBe(true);
    expect(store.selectedId()).toBeNull();
    expect(store.detailState()).toBe('none');
  });

  it('selects the first item when the panel appears, and keeps a selection it has', async () => {
    await loaded(['a', 'b'], false);

    store.showDetail(true);
    store.select('b');
    store.showDetail(true);

    expect(store.selectedId()).toBe('b');
    expect(fake.items.map((asked) => asked.about)).toEqual(['a', 'b']);
  });

  it('aborts the earlier detail when another item is selected, and never shows it', async () => {
    await loaded();

    store.select('b');

    expect(fake.items[0]!.signal.aborted).toBe(true);
    await fake.items[0]!.answer(detail('a'));
    await fake.items[1]!.answer(detail('b'));
    expect(store.detail()).toMatchObject({ title: 'Listing b' });
  });

  it('asks nothing again for the item already selected', async () => {
    await loaded();

    store.select('a');

    expect(fake.items).toHaveLength(1);
  });

  it('shows a loading panel only once a detail has been awaited for 300 ms', async () => {
    await loaded();

    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS - 1);
    expect(store.detailSkeleton()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(store.detailSkeleton()).toBe(true);

    await fake.items[0]!.answer(detail('a'));
    expect(store.detailSkeleton()).toBe(false);
  });

  it.each([
    ['server_error', 'failed'],
    ['network', 'failed'],
    ['not_found', 'gone'],
  ])('shows a detail refused with "%s" as %s, with the queue kept', async (code, state) => {
    await loaded();

    await fake.items[0]!.refuse(code);

    expect(store.detailState()).toBe(state);
    expect(store.state()).toBe('loaded');
    expect(store.selectedId()).toBe('a');
  });

  it('asks again for a detail that failed, by "Try again" or by choosing its row', async () => {
    await loaded();
    await fake.items[0]!.refuse('server_error');

    store.retryDetail();
    await fake.items[1]!.refuse('server_error');
    store.select('a');
    await fake.items[2]!.answer(detail('a'));

    expect(fake.items.map((asked) => asked.about)).toEqual(['a', 'a', 'a']);
    expect(store.detailState()).toBe('loaded');
  });

  it('retries nothing for a detail that did not fail', async () => {
    await loaded();

    store.retryDetail();

    expect(fake.items).toHaveLength(1);
  });

  it('says that the queue failed, and loads it afresh', async () => {
    store.showDetail(true);
    void store.load();
    await fake.pages[0]!.refuse('server_error');
    expect(store.state()).toBe('failed');
    expect(fake.items).toEqual([]);

    void store.load();
    await fake.pages[1]!.answer(page(['a']));

    expect(store.state()).toBe('loaded');
    expect(store.selectedId()).toBe('a');
  });

  it('is empty when nothing waits, and asks for no detail', async () => {
    await loaded([]);

    expect(store.state()).toBe('empty');
    expect(fake.items).toEqual([]);
  });

  it('selects the first item afresh when the queue is reloaded', async () => {
    await loaded();
    await fake.items[0]!.refuse('not_found');

    void store.load();
    await fake.pages[1]!.answer(page(['b']));

    expect(store.selectedId()).toBe('b');
    expect(store.detailState()).toBe('loading');
  });

  /** The ids of page `index` of a queue of `total` items. */
  const idsOf = (index: number, total: number) =>
    Array.from(
      { length: Math.min(PAGE_SIZE, total - index * PAGE_SIZE) },
      (_, position) => `${index}-${position}`,
    );
  const cursorTo = (index: number, total: number) =>
    index * PAGE_SIZE < total ? `c${index}` : null;

  async function answerPage(index: number, total: number): Promise<void> {
    await fake.pages.at(-1)!.answer(page(idsOf(index, total), cursorTo(index + 1, total), total));
  }

  async function loadedQueueOf(total: number): Promise<void> {
    void store.load();
    await answerPage(0, total);
  }

  it('asks for the next page by its cursor, once, and nothing after the last', async () => {
    await loadedQueueOf(63);
    expect(store.nextCount()).toBe(13);
    expect(store.moreState()).toBe('idle');

    void store.loadMore('down', () => 0);
    void store.loadMore('down', () => 0);
    expect(store.moreState()).toBe('loading');
    await answerPage(1, 63);

    expect(fake.pages.map((asked) => asked.about)).toEqual([null, 'c1']);
    expect(store.held()).toBe(63);
    expect(store.moreState()).toBe('done');
    await store.loadMore('down', () => 0);
    expect(fake.pages).toHaveLength(2);
  });

  it('keeps the items shown when the next page fails, and asks for it again', async () => {
    await loadedQueueOf(63);

    void store.loadMore('down', () => 0);
    await fake.pages.at(-1)!.refuse('server_error');

    expect(store.moreState()).toBe('failed');
    expect(store.state()).toBe('loaded');
    expect(store.held()).toBe(50);
    void store.loadMore('down', () => 0);
    await answerPage(1, 63);
    expect(store.held()).toBe(63);
  });

  it('keeps at most three pages, and asks for a released one again by its cursor', async () => {
    const total = 5 * PAGE_SIZE;
    await loadedQueueOf(total);

    for (let index = 1; index < 5; index++) {
      void store.loadMore('down', () => 100);
      await answerPage(index, total);
      expect(store.held()).toBeLessThanOrEqual(WINDOW_PAGES * PAGE_SIZE);
    }

    expect(store.pages().map((held) => held.index)).toEqual([2, 3, 4]);
    expect(store.before()).toBe(200);
    expect(store.after()).toBe(0);
    expect(store.hasBefore()).toBe(true);

    void store.loadMore('up', () => 100);
    expect(fake.pages.at(-1)!.about).toBe('c1');
    await answerPage(1, total);

    expect(store.pages().map((held) => held.index)).toEqual([1, 2, 3]);
    expect(store.held()).toBe(WINDOW_PAGES * PAGE_SIZE);
    expect(store.after()).toBe(100);
    expect(store.moreState()).toBe('idle');
    expect(store.nextCount()).toBe(PAGE_SIZE);
  });

  it('keeps the selection when its row is released', async () => {
    store.showDetail(true);
    await loadedQueueOf(4 * PAGE_SIZE);

    for (let index = 1; index < 4; index++) {
      void store.loadMore('down', () => 0);
      await answerPage(index, 4 * PAGE_SIZE);
    }

    expect(store.selectedId()).toBe('0-0');
    expect(fake.items).toHaveLength(1);
  });

  it('takes how many wait from the newest page', async () => {
    await loadedQueueOf(63);

    void store.loadMore('down', () => 0);
    await fake.pages.at(-1)!.answer(page(idsOf(1, 63), null, 70));

    expect(store.waitingCount()).toBe(70);
  });

  it('aborts what it was loading and clears its timers when the admin leaves', async () => {
    await loaded();
    void store.load();

    TestBed.resetTestingModule();

    expect(fake.pages[1]!.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  /** The queue loaded, with the detail of the item selected. */
  async function showing(ids = ['a', 'b', 'c'], selected = ids[0]!): Promise<void> {
    await loaded(ids);
    store.select(selected);
    await fake.items.at(-1)!.answer(detail(selected));
  }

  const titles = () =>
    TestBed.inject(ToastQueue)
      .toasts()
      .map((toast) => toast.title);
  const idsHeld = () => store.items().map((item) => item.id);

  // L2-020 criteria 11 and 15.
  it('drops a decided item, says so, and selects the one that followed it', async () => {
    await showing(['a', 'b', 'c'], 'b');

    const outcome = store.decide('approve');
    expect(fake.decisions[0]!.about).toBe('b approve 0');
    await fake.decisions[0]!.answer({ closedItemIds: ['b'] });

    await expect(outcome).resolves.toBe('done');
    expect(idsHeld()).toEqual(['a', 'c']);
    expect(store.waitingCount()).toBe(2);
    expect(store.selectedId()).toBe('c');
    expect(fake.items.at(-1)!.about).toBe('c');
    expect(titles()).toEqual(['Approved']);
  });

  it('selects the one before when the last is decided', async () => {
    await showing(['a', 'b'], 'b');

    void store.decide('approve');
    await fake.decisions[0]!.answer({ closedItemIds: ['b'] });

    expect(store.selectedId()).toBe('a');
  });

  // Removing a reported listing closes every item about it.
  it('drops every item the decision closed and selects the next that stays', async () => {
    await showing(['a', 'b', 'c', 'd'], 'b');

    void store.decide('remove');
    await fake.decisions[0]!.answer({ closedItemIds: ['b', 'c', 'elsewhere'] });

    expect(idsHeld()).toEqual(['a', 'd']);
    expect(store.waitingCount()).toBe(1);
    expect(store.selectedId()).toBe('d');
  });

  it('keeps the item the admin selected while the decision was on its way', async () => {
    await showing(['a', 'b', 'c'], 'a');

    void store.decide('approve');
    store.select('c');
    await fake.decisions[0]!.answer({ closedItemIds: ['a'] });

    expect(store.selectedId()).toBe('c');
    expect(idsHeld()).toEqual(['b', 'c']);
  });

  it('is all caught up once the last item is decided', async () => {
    await showing(['a']);

    void store.decide('approve');
    await fake.decisions[0]!.answer({ closedItemIds: ['a'] });

    expect(store.state()).toBe('empty');
    expect(store.selectedId()).toBeNull();
    expect(store.detailState()).toBe('none');
  });

  it('reads the queue again when the rows held run out while more wait', async () => {
    store.showDetail(true);
    void store.load();
    await fake.pages[0]!.answer(page(['a'], 'next', 2));
    await fake.items[0]!.answer(detail('a'));

    void store.decide('approve');
    await fake.decisions[0]!.answer({ closedItemIds: ['a'] });

    expect(fake.pages.map((asked) => asked.about)).toEqual([null, null]);
    expect(store.state()).toBe('loading');
  });

  // L2-020 criterion 16.
  it('has one decision in flight at a time', async () => {
    await showing();

    void store.decide('approve');
    expect(store.deciding()).toEqual({ id: 'a', decision: 'approve' });
    await expect(store.decide('remove')).resolves.toBe('ignored');
    await fake.decisions[0]!.answer({ closedItemIds: ['a'] });

    expect(fake.decisions).toHaveLength(1);
    expect(store.deciding()).toBeNull();
  });

  it('decides nothing while no detail is shown', async () => {
    await loaded();

    await expect(store.decide('approve')).resolves.toBe('ignored');

    expect(fake.decisions).toEqual([]);
  });

  it('aborts a decision on its way when the admin leaves', async () => {
    await showing();
    void store.decide('approve');

    TestBed.resetTestingModule();

    expect(fake.decisions[0]!.signal.aborted).toBe(true);
  });

  it('asks again for a next page that was on its way when a decision was made', async () => {
    store.showDetail(true);
    void store.load();
    await fake.pages[0]!.answer(page(['a', 'b'], 'next', 3));
    await fake.items[0]!.answer(detail('a'));
    void store.loadMore('down', () => 0);

    void store.decide('approve');
    await fake.decisions[0]!.answer({ closedItemIds: ['a'] });

    expect(fake.pages[1]!.signal.aborted).toBe(true);
    expect(store.moreState()).toBe('idle');
    expect(store.nextCount()).toBe(1);
  });

  // After decisions the pages no longer end where they did, so one asked again can overlap.
  it('shows no item twice when a page asked again overlaps one still held', async () => {
    void store.load();
    await fake.pages[0]!.answer(page(['a', 'b'], 'next', 4));
    void store.loadMore('down', () => 0);
    await fake.pages[1]!.answer(page(['b', 'c'], null, 3));

    expect(idsHeld()).toEqual(['a', 'b', 'c']);
  });

  const decided = {
    decided: { decision: 'approve' as const, at: '2026-06-08T19:14:00Z', byYou: false },
  };
  const toasts = () => TestBed.inject(ToastQueue).toasts();

  // L2-020 criteria 13 and 17.
  it('keeps an item decided first on the panel, and drops it on the way to the next', async () => {
    await showing();

    const outcome = store.decide('approve');
    await fake.decisions[0]!.refuse('already_decided', decided);

    await expect(outcome).resolves.toBe('conflict');
    expect(store.conflict()?.title).toBe('This was already decided.');
    expect(idsHeld()).toEqual(['a', 'b', 'c']);
    expect(titles()).toEqual(['Already decided']);
    await expect(store.decide('approve')).resolves.toBe('ignored');

    store.goToNext();

    expect(idsHeld()).toEqual(['b', 'c']);
    expect(store.waitingCount()).toBe(2);
    expect(store.selectedId()).toBe('b');
    expect(store.conflict()).toBeNull();
  });

  it('forgets the conflict when another item is selected', async () => {
    await showing();
    void store.decide('approve');
    await fake.decisions[0]!.refuse('already_decided', decided);

    store.select('b');
    store.goToNext();

    expect(store.conflict()).toBeNull();
    expect(idsHeld()).toEqual(['a', 'b', 'c']);
  });

  // L2-020 criterion 18.
  it('shows an item that no longer waits as gone', async () => {
    await showing();

    const outcome = store.decide('approve');
    await fake.decisions[0]!.refuse('not_found');

    await expect(outcome).resolves.toBe('gone');
    expect(store.detailState()).toBe('gone');
    expect(store.detail()).toBeNull();
    expect(toasts()).toEqual([]);
  });

  // L2-020 criterion 12.
  it('offers a failed approval again, with the same item, decision and version', async () => {
    await showing();
    const outcome = store.decide('approve');
    await fake.decisions[0]!.refuse('server_error');
    await expect(outcome).resolves.toBe('failed');
    expect(toasts().map((toast) => [toast.tone, toast.action?.label])).toEqual([
      ['danger', 'Try again'],
    ]);
    expect(idsHeld()).toEqual(['a', 'b', 'c']);
    store.select('c');

    void toasts()[0]!.action!.run();

    expect(fake.decisions[1]!.about).toBe('a approve 0');
    expect(toasts()).toEqual([]);
    await fake.decisions[1]!.answer({ closedItemIds: ['a'] });
    expect(titles()).toEqual(['Approved']);
    expect(store.selectedId()).toBe('c');
  });

  // L2-020 criterion 10: the confirmation says it.
  it('leaves a failed removal to its confirmation', async () => {
    await showing();

    const outcome = store.decide('remove');
    await fake.decisions[0]!.refuse('server_error');

    await expect(outcome).resolves.toBe('failed');
    expect(toasts()).toEqual([]);
  });

  // A danger toast stays until it is dismissed or its item is decided.
  it('drops the failure of an item once it is decided', async () => {
    await showing();
    void store.decide('approve');
    await fake.decisions[0]!.refuse('server_error');

    void store.decide('remove');
    await fake.decisions[1]!.answer({ closedItemIds: ['a'] });

    expect(titles()).toEqual(['Removed']);
  });

  const counts = (newListings: number, reports = 0) => ({ newListings, reports, newMembers: 0 });
  const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

  // L2-019 criterion 12; ADR 0027.
  it('looks for new items every 60 s, one look at a time, since the first page', async () => {
    await loaded();

    await wait(ARRIVALS_MS - 1);
    expect(fake.arrivals).toEqual([]);
    await wait(1);
    expect(fake.arrivals.map((asked) => asked.about)).toEqual(['2026-06-08T19:00:00Z']);
    await wait(3 * ARRIVALS_MS);
    expect(fake.arrivals).toHaveLength(1);
    await fake.arrivals[0]!.answer(counts(0));
    await wait(ARRIVALS_MS);

    expect(fake.arrivals).toHaveLength(2);
    expect(ARRIVALS_MS).toBe(60_000);
    expect(titles()).toEqual([]);
  });

  it('says what arrived, and again only once more has', async () => {
    await loaded([]);
    const look = async (answer: ReviewArrivals) => {
      await wait(ARRIVALS_MS);
      await fake.arrivals.at(-1)!.answer(answer);
    };

    await look(counts(1));
    expect(titles()).toEqual(['1 new item is waiting']);
    TestBed.inject(ToastQueue).dismiss(toasts()[0]!.id);
    await look(counts(1));
    expect(titles()).toEqual([]);
    await look(counts(1, 1));

    expect(titles()).toEqual(['2 new items are waiting']);
    expect(toasts()[0]).toMatchObject({ tone: 'info', action: { label: 'Show them' } });
  });

  it('reads the queue from its oldest item when asked to show them', async () => {
    await loaded();
    await wait(ARRIVALS_MS);
    await fake.arrivals[0]!.answer(counts(1));

    void toasts()[0]!.action!.run();

    expect(fake.pages).toHaveLength(2);
    expect(titles()).toEqual([]);
    await fake.pages[1]!.answer(page(['a', 'b', 'c']));
    await wait(ARRIVALS_MS);
    await fake.arrivals[1]!.answer(counts(1));
    expect(titles()).toEqual(['1 new item is waiting']);
  });

  it('does not look while the page is hidden', async () => {
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await loaded();

    await wait(2 * ARRIVALS_MS);
    expect(fake.arrivals).toEqual([]);
    hidden.mockReturnValue('visible');
    await wait(ARRIVALS_MS);

    expect(fake.arrivals).toHaveLength(1);
    hidden.mockRestore();
  });

  it('says nothing of a look that fails, and looks again', async () => {
    await loaded();

    await wait(ARRIVALS_MS);
    await fake.arrivals[0]!.refuse('server_error');
    await wait(ARRIVALS_MS);

    expect(fake.arrivals).toHaveLength(2);
    expect(titles()).toEqual([]);
  });

  it('looks for nothing while the queue could not be read', async () => {
    void store.load();
    await fake.pages[0]!.refuse('server_error');

    await wait(2 * ARRIVALS_MS);

    expect(fake.arrivals).toEqual([]);
  });

  it('stops looking, and aborts a look on its way, when the admin leaves', async () => {
    await loaded();
    await wait(ARRIVALS_MS);

    TestBed.resetTestingModule();

    expect(fake.arrivals[0]!.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  // A released page asked for before the decision could bring the decided item back.
  it('drops a page above that was on its way when a decision was made', async () => {
    const total = 4 * PAGE_SIZE;
    store.showDetail(true);
    await loadedQueueOf(total);
    await fake.items[0]!.answer(detail('0-0'));
    for (let index = 1; index < 4; index++) {
      void store.loadMore('down', () => 100);
      await answerPage(index, total);
    }
    void store.loadMore('up', () => 100);

    void store.decide('approve');
    await fake.decisions[0]!.answer({ closedItemIds: ['0-0'] });

    expect(fake.pages.at(-1)!.signal.aborted).toBe(true);
    expect(idsHeld()).not.toContain('0-0');
  });

  // "Show them" moves focus once the queue is read; a reading that was cut short moves nothing.
  it('answers that nothing was shown when the admin leaves while the arrivals load', async () => {
    await loaded();
    await wait(ARRIVALS_MS);
    await fake.arrivals[0]!.answer(counts(1));
    const shown = toasts()[0]!.action!.run();

    TestBed.resetTestingModule();

    await expect(shown).resolves.toBe('ignored');
  });

  // verify-members-and-churches design: "Confirm church" (L2-018, criteria 7 to 9; ADR 0031).
  describe('confirming a church', () => {
    /** The queue loaded, with the detail of a new member selected. */
    async function showingMember(verified = false, ids = ['a', 'b', 'c']): Promise<void> {
      await loaded(ids);
      await fake.items.at(-1)!.answer(memberDetail(ids[0]!, verified));
    }

    const churchStatus = () => {
      const shown = store.detail();
      return shown?.facts.find((fact) => fact.term === 'Church status');
    };

    it('confirms the church of the new member shown, says so, and decides nothing', async () => {
      await showingMember();
      expect(churchStatus()).toMatchObject({ value: 'Not verified', action: 'confirm-church' });

      const outcome = store.confirmChurch();
      expect(store.confirmingHere()).toBe(true);
      expect(store.busy()).toBe(true);
      expect(fake.churches[0]!.about).toBe('st-pauls');
      await fake.churches[0]!.answer();

      await expect(outcome).resolves.toBe('done');
      expect(churchStatus()).toMatchObject({ value: 'Verified', action: null });
      expect(store.confirmingHere()).toBe(false);
      expect(store.busy()).toBe(false);
      expect(toasts().map((toast) => [toast.tone, toast.title, toast.text])).toEqual([
        [
          'success',
          'Church confirmed',
          'St. Paul’s Anglican is now marked Verified on its members’ listings.',
        ],
      ]);
      expect(idsHeld()).toEqual(['a', 'b', 'c']);
      expect(store.selectedId()).toBe('a');
      expect(fake.items).toHaveLength(1);
      expect(fake.decisions).toEqual([]);
    });

    it.each([
      ['a church already verified', () => showingMember(true)],
      ['a listing', () => showing()],
      ['no detail', () => loaded(['a'], false)],
    ])('confirms nothing for %s', async (_, arrange) => {
      await arrange();

      await expect(store.confirmChurch()).resolves.toBe('ignored');

      expect(fake.churches).toEqual([]);
    });

    it('has one confirmation in flight at a time, and no decision beside it', async () => {
      await showingMember();

      void store.confirmChurch();
      await expect(store.confirmChurch()).resolves.toBe('ignored');
      await expect(store.decide('approve')).resolves.toBe('ignored');
      await fake.churches[0]!.answer();

      expect(fake.churches).toHaveLength(1);
      expect(fake.decisions).toEqual([]);
    });

    it('confirms nothing while a decision is in flight', async () => {
      await showingMember();

      void store.decide('approve');
      await expect(store.confirmChurch()).resolves.toBe('ignored');

      expect(fake.churches).toEqual([]);
      await fake.decisions[0]!.answer({ closedItemIds: ['a'] });
    });

    it('offers a failed confirmation again, for the same church', async () => {
      await showingMember();
      const outcome = store.confirmChurch();
      await fake.churches[0]!.refuse('server_error');
      await expect(outcome).resolves.toBe('failed');
      expect(toasts().map((toast) => [toast.tone, toast.title, toast.text])).toEqual([
        [
          'danger',
          'The church wasn’t confirmed',
          'We couldn’t reach christian.rent. St. Paul’s Anglican is still not verified.',
        ],
      ]);
      expect(churchStatus()).toMatchObject({ action: 'confirm-church' });
      expect(store.busy()).toBe(false);

      const again = toasts()[0]!.action!.run();

      expect(fake.churches[1]!.about).toBe('st-pauls');
      expect(toasts()).toEqual([]);
      await fake.churches[1]!.answer();
      await expect(again).resolves.toBe('done');
      expect(titles()).toEqual(['Church confirmed']);
      expect(churchStatus()).toMatchObject({ value: 'Verified', action: null });
    });

    it('keeps confirming when another item is selected, and leaves that item as it is', async () => {
      await showingMember();
      const outcome = store.confirmChurch();
      store.select('b');
      await fake.items.at(-1)!.answer(detail('b'));
      expect(fake.churches[0]!.signal.aborted).toBe(false);
      expect(store.confirmingHere()).toBe(false);
      expect(store.busy()).toBe(true);

      await fake.churches[0]!.answer();

      await expect(outcome).resolves.toBe('done');
      expect(titles()).toEqual(['Church confirmed']);
      expect(store.detail()).toMatchObject({ type: 'listing', title: 'Listing b' });
    });

    it('shows another new member of the church as busy while it is confirmed', async () => {
      await showingMember();
      void store.confirmChurch();

      store.select('b');
      await fake.items.at(-1)!.answer(memberDetail('b'));
      expect(store.confirmingHere()).toBe(true);
      await fake.churches[0]!.answer();

      expect(churchStatus()).toMatchObject({ value: 'Verified', action: null });
    });

    it('aborts a confirmation on its way when the admin leaves, and says nothing', async () => {
      await showingMember();
      const outcome = store.confirmChurch();

      TestBed.resetTestingModule();

      expect(fake.churches[0]!.signal.aborted).toBe(true);
      await expect(outcome).resolves.toBe('ignored');
    });
  });
});
