import { TestBed } from '@angular/core/testing';
import {
  REVIEW_QUEUE_API,
  type ReviewItemDetail,
  type ReviewItemSummary,
  type ReviewQueuePage,
} from '@rent/api';
import { ReviewQueueStore, SKELETON_DELAY_MS } from './review-queue-store';

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

  it('aborts what it was loading and clears its timers when the admin leaves', async () => {
    await loaded();
    void store.load();

    TestBed.resetTestingModule();

    expect(fake.pages[1]!.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
