import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  LISTINGS_API,
  type ListingCard,
  type ListingsApi,
  type ListingsPage,
} from '@rent/api';
import { BrowseStore, SKELETON_DELAY_MS } from './browse-store';

const unreachable: ApiError = { status: 0, code: null, retryAt: null, fields: null };

function card(id: string): ListingCard {
  return {
    id,
    offer: 'for-rent',
    kind: 'space',
    title: `Listing ${id}`,
    price: { amount: 45, period: 'hour' },
    area: 'Langley',
    distanceKm: null,
    when: { text: 'Weekdays', start: null, end: null },
    posterName: 'Pastor Dan Whitaker',
    churchName: 'Grace Community Church',
    photo: null,
  };
}

function pageOf(ids: string[], nextCursor: string | null = null): ListingsPage {
  return {
    items: ids.map(card),
    nextCursor,
    counts: { everything: ids.length, forRent: ids.length, wanted: 0 },
  };
}

/** A ListingsApi whose answers a test gives one at a time. */
class FakeListingsApi implements ListingsApi {
  readonly calls: {
    cursor: string | null;
    signal: AbortSignal;
    resolve: (page: ListingsPage) => void;
    reject: (error: unknown) => void;
  }[] = [];

  browse(cursor: string | null, signal: AbortSignal): Promise<ListingsPage> {
    return new Promise((resolve, reject) => this.calls.push({ cursor, signal, resolve, reject }));
  }
}

describe('BrowseStore', () => {
  let api: FakeListingsApi;
  let store: BrowseStore;

  beforeEach(() => {
    vi.useFakeTimers();
    api = new FakeListingsApi();
    TestBed.configureTestingModule({
      providers: [BrowseStore, { provide: LISTINGS_API, useValue: api }],
    });
    store = TestBed.inject(BrowseStore);
  });

  afterEach(() => vi.useRealTimers());

  // L2-033 criterion 5.
  it('shows no skeleton when the first page answers within 300 ms', async () => {
    const loading = store.loadFirst();
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS - 1);
    api.calls[0]!.resolve(pageOf(['a']));
    await loading;
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS);

    expect(store.skeleton()).toBe(false);
    expect(store.state()).toBe('loaded');
  });

  // L2-033 criterion 1.
  it('shows the skeleton once the first page has taken 300 ms, until it arrives', async () => {
    const loading = store.loadFirst();
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS);

    expect(store.skeleton()).toBe(true);
    expect(store.announcement()).toBe('Loading listings');

    api.calls[0]!.resolve(pageOf(['a', 'b']));
    await loading;

    expect(store.skeleton()).toBe(false);
    expect(store.cards().map((view) => view.href)).toEqual(['/listings/a', '/listings/b']);
    expect(store.announcement()).toBe('2 listings');
  });

  // L2-001 criterion 6.
  it('is empty when no listing is approved', async () => {
    const loading = store.loadFirst();
    api.calls[0]!.resolve(pageOf([]));
    await loading;

    expect(store.state()).toBe('empty');
    expect(store.announcement()).toBe('No listings yet');
  });

  // L2-033 criterion 2.
  it('fails plainly when the backend cannot be reached, and Try again loads again', async () => {
    const failing = store.loadFirst();
    api.calls[0]!.reject(unreachable);
    await failing;

    expect(store.state()).toBe('failed');
    expect(store.announcement()).toBe('We couldn’t load the listings.');

    const retrying = store.loadFirst();
    expect(store.state()).toBe('loading');
    api.calls[1]!.resolve(pageOf(['a']));
    await retrying;

    expect(store.state()).toBe('loaded');
    expect(store.announcement()).toBe('1 listing');
  });

  // AGENTS.md, Lazy loading and memory: leaving releases what the screen acquired.
  it('aborts the request in flight and stops the timer when Browse is left', async () => {
    void store.loadFirst();

    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS);

    expect(api.calls[0]!.signal.aborted).toBe(true);
    expect(store.skeleton()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('BrowseStore, further down the list', () => {
  let api: FakeListingsApi;
  let store: BrowseStore;
  const measure = () => 500;

  async function answer(call: number, page: ListingsPage, loading: Promise<void>) {
    api.calls[call]!.resolve(page);
    await loading;
  }

  beforeEach(async () => {
    api = new FakeListingsApi();
    TestBed.configureTestingModule({
      providers: [BrowseStore, { provide: LISTINGS_API, useValue: api }],
    });
    store = TestBed.inject(BrowseStore);
    await answer(0, pageOf(['a1', 'a2'], 'c2'), store.loadFirst());
  });

  // L2-006 criteria 1 and 4.
  it('asks for the next page by its cursor, announcing the wait', async () => {
    const loading = store.loadMore('down', measure);

    expect(api.calls[1]!.cursor).toBe('c2');
    expect(store.moreState()).toBe('loading');
    expect(store.announcement()).toBe('Loading more listings');

    await answer(1, pageOf(['b1'], null), loading);

    expect(store.cards().map((card) => card.href)).toEqual([
      '/listings/a1',
      '/listings/a2',
      '/listings/b1',
    ]);
    expect(store.moreState()).toBe('done');
  });

  // L2-006 criterion 2.
  it('asks for nothing after the last page, and one page at a time', async () => {
    void store.loadMore('down', measure);
    void store.loadMore('down', measure);
    expect(api.calls).toHaveLength(2);

    await answer(1, pageOf(['b1'], null), Promise.resolve());
    await store.loadMore('down', measure);

    expect(api.calls).toHaveLength(2);
  });

  // L2-006 criterion 3.
  it('keeps the listings shown when the next page fails, and tries again', async () => {
    const failing = store.loadMore('down', measure);
    api.calls[1]!.reject(unreachable);
    await failing;

    expect(store.moreState()).toBe('failed');
    expect(store.cards()).toHaveLength(2);

    const retrying = store.loadMore('down', measure);
    await answer(2, pageOf(['b1'], null), retrying);

    expect(store.cards()).toHaveLength(3);
    expect(store.moreState()).toBe('done');
  });

  // L2-030 criterion 4.
  it('holds three pages and reserves the height of those it released', async () => {
    for (let n = 2; n <= 4; n++) {
      const loading = store.loadMore('down', measure);
      await answer(n - 1, pageOf([`p${n}`], `c${n + 1}`), loading);
    }

    expect(store.pages().map((page) => page.index)).toEqual([1, 2, 3]);
    expect(store.before()).toBe(500);
    expect(store.hasBefore()).toBe(true);

    const up = store.loadMore('up', measure);
    expect(api.calls[4]!.cursor).toBeNull();
    await answer(4, pageOf(['a1', 'a2'], 'c2'), up);

    expect(store.pages().map((page) => page.index)).toEqual([0, 1, 2]);
    expect(store.after()).toBe(500);
  });

  it('aborts the next page when Browse is left', () => {
    void store.loadMore('down', measure);

    TestBed.resetTestingModule();

    expect(api.calls[1]!.signal.aborted).toBe(true);
  });
});
