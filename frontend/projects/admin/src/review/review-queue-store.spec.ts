import { TestBed } from '@angular/core/testing';
import {
  REVIEW_QUEUE_API,
  type ReviewItemDetail,
  type ReviewItemSummary,
  type ReviewQueuePage,
} from '@rent/api';
import { PAGE_SIZE, ReviewQueueStore, SKELETON_DELAY_MS, WINDOW_PAGES } from './review-queue-store';

/** A request the test answers, with the signal it was given. */
interface Asked<T> {
  readonly about: string | null;
  readonly signal: AbortSignal;
  answer(value: T): Promise<void>;
  refuse(code: string): Promise<void>;
}

export function fakeApi() {
  const pages: Asked<ReviewQueuePage>[] = [];
  const items: Asked<ReviewItemDetail>[] = [];
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
        refuse: (code) => {
          reject({ status: 0, code, retryAt: null, reportedAt: null, fields: null });
          return settle();
        },
      });
    });
  return {
    pages,
    items,
    api: {
      page: (cursor: string | null, signal: AbortSignal) => ask(pages, cursor, signal),
      item: (id: string, signal: AbortSignal) => ask(items, id, signal),
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
  return { items: ids.map(row), nextCursor, waitingCount };
}

export function detail(id: string): ReviewItemDetail {
  return {
    id,
    kind: 'new-listing',
    waitingSince: '2026-06-08T16:00:00Z',
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
      providers: [ReviewQueueStore, { provide: REVIEW_QUEUE_API, useValue: fake.api }],
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
});
