import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  REVIEW_QUEUE_API,
  type ReviewItemDetail,
  type ReviewItemSummary,
  type ReviewQueueApi,
  type ReviewQueuePage,
} from '@rent/api';
import { ReviewQueueStore, SKELETON_DELAY_MS } from './review-queue-store';

const unreachable: ApiError = {
  status: 0,
  code: null,
  retryAt: null,
  reportedAt: null,
  decided: null,
  fields: null,
};

function item(n: number): ReviewItemSummary {
  return {
    id: `item-${n}`,
    kind: 'new-member',
    title: `Member ${n}`,
    who: 'Grace Community Church',
    waitingSince: '2026-06-08T12:00:00Z',
    offer: null,
    thumbUrl: null,
  };
}

function pageOf(from: number, count: number, waiting: number): ReviewQueuePage {
  const items = Array.from({ length: count }, (_, index) => item(from + index));
  const next = from + count < waiting ? String(from + count) : null;
  return { items, nextCursor: next, waitingCount: waiting };
}

/** A ReviewQueueApi whose answers a test gives one at a time. */
class FakeReviewQueueApi implements ReviewQueueApi {
  readonly calls: {
    cursor: string | null;
    signal: AbortSignal;
    resolve: (page: ReviewQueuePage) => void;
    reject: (error: unknown) => void;
  }[] = [];

  page(cursor: string | null, signal: AbortSignal): Promise<ReviewQueuePage> {
    return new Promise((resolve, reject) => this.calls.push({ cursor, signal, resolve, reject }));
  }

  decide(): Promise<void> {
    return Promise.reject(new Error('Not asked in these tests.'));
  }

  item(): Promise<ReviewItemDetail> {
    return Promise.reject(new Error('Not asked in these tests.'));
  }

  last() {
    return this.calls[this.calls.length - 1]!;
  }
}

let api: FakeReviewQueueApi;

function create(): ReviewQueueStore {
  api = new FakeReviewQueueApi();
  TestBed.configureTestingModule({
    providers: [ReviewQueueStore, { provide: REVIEW_QUEUE_API, useValue: api }],
  });
  return TestBed.inject(ReviewQueueStore);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

// view-review-queue design; L2-019, L2-030, L2-033.
describe('ReviewQueueStore', () => {
  afterEach(() => vi.useRealTimers());

  it('lists the first page, oldest first, with how many wait', async () => {
    const store = create();

    const loading = store.load();
    api.last().resolve(pageOf(0, 4, 4));
    await loading;

    expect(store.state()).toBe('loaded');
    expect(store.items().map((view) => view.title)).toEqual([
      'Member 0',
      'Member 1',
      'Member 2',
      'Member 3',
    ]);
    expect(store.waiting()).toBe(4);
    expect(store.summary()).toBe('4 waiting · oldest first');
    expect(store.more()).toBe('done');
  });

  // L2-020 criterion 11; ADR 0025: a decided item leaves and the next one opens.
  it.each([
    ['item-1', 'item-2'],
    ['item-0', 'item-1'],
    ['item-3', 'item-2'],
    ['item-9', 'item-0'],
  ])('opens %s, then %s once it is decided', async (id, next) => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 4, 4));
    await loading;

    expect(store.nextAfter(id)).toBe(next);
  });

  it('drops a decided item and lowers the number waiting', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 4, 9));
    await loading;

    store.drop('item-1');

    expect(store.items().map((view) => view.id)).toEqual(['item-0', 'item-2', 'item-3']);
    expect(store.waiting()).toBe(8);
    expect(store.summary()).toBe('8 waiting · oldest first · showing 3');
  });

  it('is all caught up once the last item is decided (L2-019, criterion 3)', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 1, 1));
    await loading;

    store.drop('item-0');

    expect(store.state()).toBe('empty');
    expect(store.waiting()).toBe(0);
    expect(api.calls).toHaveLength(1);
  });

  it('reads the queue again when every item held is decided and more wait', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 1, 3));
    await loading;

    store.drop('item-0');

    expect(api.calls).toHaveLength(2);
    expect(api.last().cursor).toBeNull();
  });

  // L2-019 criterion 12; ADR 0025: how many arrived, without changing what is shown.
  it('answers how many arrived since the queue was read, less those decided', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 4, 4));
    await loading;
    store.drop('item-0');

    const asking = store.arrivedSinceLoad();
    expect(api.last().cursor).toBeNull();
    api.last().resolve(pageOf(0, 5, 5));

    expect(await asking).toBe(2);
    expect(store.items()).toHaveLength(3);
    expect(store.waiting()).toBe(3);
  });

  it('answers that none arrived when it cannot ask, or while the queue loads', async () => {
    const store = create();
    expect(await store.arrivedSinceLoad()).toBe(0);
    expect(api.calls).toHaveLength(0);
    const loading = store.load();
    api.last().resolve(pageOf(0, 1, 1));
    await loading;

    const asking = store.arrivedSinceLoad();
    api.last().reject(unreachable);

    expect(await asking).toBe(0);
  });

  it('is empty when nothing waits (L2-019, criterion 3)', async () => {
    const store = create();

    const loading = store.load();
    api.last().resolve(pageOf(0, 0, 0));
    await loading;

    expect(store.state()).toBe('empty');
    expect(store.summary()).toBe('Nothing is waiting');
  });

  it('fails when the queue cannot be read, and loads again (L2-033, criterion 2)', async () => {
    const store = create();
    const failing = store.load();
    api.last().reject(unreachable);
    await failing;
    expect(store.state()).toBe('failed');

    const again = store.load();
    api.last().resolve(pageOf(0, 1, 1));
    await again;

    expect(store.state()).toBe('loaded');
  });

  it('shows rows in its shape only after 300 ms (L2-033, criteria 1 and 5)', async () => {
    vi.useFakeTimers();
    const store = create();
    void store.load();

    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(store.skeleton()).toBe(false);
    expect(store.summary()).toBe('');
    vi.advanceTimersByTime(1);

    expect(store.skeleton()).toBe(true);
    expect(store.summary()).toBe('Loading the queue…');
  });

  it('asks for the next page by its cursor and says how many are shown (criteria 4 and 10)', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 50, 63));
    await loading;
    expect(store.summary()).toBe('63 waiting · oldest first · showing 50');

    const more = store.loadMore('down', () => 0);
    expect(store.more()).toBe('loading');
    expect(api.last().cursor).toBe('50');
    api.last().resolve(pageOf(50, 13, 63));
    await more;

    expect(store.items()).toHaveLength(63);
    expect(store.summary()).toBe('63 waiting · oldest first');
  });

  it('holds at most three pages, and asks again for one it released (L2-030, criterion 4)', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 50, 200));
    await loading;
    for (const from of [50, 100, 150]) {
      const more = store.loadMore('down', () => 1000);
      api.last().resolve(pageOf(from, 50, 200));
      await more;
    }

    expect(store.items()).toHaveLength(150);
    expect(store.items()[0]!.title).toBe('Member 50');
    expect(store.before()).toBe(1000);
    expect(store.hasBefore()).toBe(true);

    const up = store.loadMore('up', () => 1000);
    expect(api.last().cursor).toBeNull();
    api.last().resolve(pageOf(0, 50, 200));
    await up;

    expect(store.items()[0]!.title).toBe('Member 0');
    expect(store.items()).toHaveLength(150);
    expect(store.after()).toBe(1000);
  });

  it('offers "Try again" when the next page fails, keeping what is shown', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 50, 63));
    await loading;

    const more = store.loadMore('down', () => 0);
    api.last().reject(unreachable);
    await more;

    expect(store.more()).toBe('failed');
    expect(store.items()).toHaveLength(50);
  });

  it('asks one page at a time', async () => {
    const store = create();
    const loading = store.load();
    api.last().resolve(pageOf(0, 50, 200));
    await loading;

    void store.loadMore('down', () => 0);
    void store.loadMore('down', () => 0);
    await settle();

    expect(api.calls).toHaveLength(2);
  });

  it('aborts its request and clears its timer when the admin leaves', () => {
    vi.useFakeTimers();
    const store = create();
    void store.load();
    const { signal } = api.last();

    TestBed.resetTestingModule();

    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(store).toBeDefined();
  });
});
