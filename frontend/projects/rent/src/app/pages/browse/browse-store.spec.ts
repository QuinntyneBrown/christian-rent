import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  LISTINGS_API,
  type ListingCard,
  type ListingCounts,
  type ListingsApi,
  type ListingsFilter,
  type ListingsPage,
} from '@rent/api';
import { BrowseQuery } from '@rent/domain';
import { BrowseStore, SEARCH_DELAY_MS, SKELETON_DELAY_MS } from './browse-store';

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

function pageOf(
  ids: string[],
  nextCursor: string | null = null,
  counts: ListingCounts = { everything: ids.length, forRent: ids.length, wanted: 0 },
): ListingsPage {
  return { items: ids.map(card), nextCursor, counts };
}

/** A ListingsApi whose answers a test gives one at a time. */
class FakeListingsApi implements ListingsApi {
  readonly calls: {
    filter: ListingsFilter;
    cursor: string | null;
    signal: AbortSignal;
    resolve: (page: ListingsPage) => void;
    reject: (error: unknown) => void;
  }[] = [];

  browse(
    filter: ListingsFilter,
    cursor: string | null,
    signal: AbortSignal,
  ): Promise<ListingsPage> {
    return new Promise((resolve, reject) =>
      this.calls.push({ filter, cursor, signal, resolve, reject }),
    );
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

describe('BrowseStore, narrowed by the switch', () => {
  let api: FakeListingsApi;
  let store: BrowseStore;
  const counts: ListingCounts = { everything: 7, forRent: 4, wanted: 3 };

  beforeEach(() => {
    api = new FakeListingsApi();
    TestBed.configureTestingModule({
      providers: [BrowseStore, { provide: LISTINGS_API, useValue: api }],
    });
    store = TestBed.inject(BrowseStore);
  });

  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  // L2-002 criteria 2 and 3.
  it('asks for the first page of the query’s choice at once', () => {
    store.search(new BrowseQuery().withOffer('for-rent'));

    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]!.filter).toEqual({ offer: 'for-rent', kind: null, term: '' });
    expect(api.calls[0]!.cursor).toBeNull();
  });

  // L2-002 criterion 6: what each option holds, and nothing while loading or failed.
  it('holds the counts of the page, and none while it loads or after it failed', async () => {
    store.search(new BrowseQuery());
    expect(store.counts()).toBeNull();

    api.calls[0]!.resolve(pageOf(['a'], null, counts));
    await settle();
    expect(store.counts()).toEqual(counts);

    store.search(new BrowseQuery().withOffer('wanted'));
    expect(store.counts()).toBeNull();
    api.calls[1]!.reject(unreachable);
    await settle();

    expect(store.state()).toBe('failed');
    expect(store.counts()).toBeNull();
  });

  // L2-001 criterion 10, as the mocks word it for each option of the switch.
  it.each([
    [new BrowseQuery(), counts, '7 listings'],
    [new BrowseQuery().withOffer('for-rent'), counts, '4 listings for rent'],
    [new BrowseQuery().withOffer('for-rent'), { ...counts, forRent: 1 }, '1 listing for rent'],
    [new BrowseQuery().withOffer('wanted'), counts, '3 wanted listings'],
    [new BrowseQuery().withOffer('wanted'), { ...counts, wanted: 1 }, '1 wanted listing'],
  ])('announces %o with %o as “%s”', async (query, pageCounts, announcement) => {
    store.search(query);
    api.calls[0]!.resolve(pageOf(['a'], null, pageCounts));
    await settle();

    expect(store.announcement()).toBe(announcement);
  });

  // L2-003 criterion 3: a later choice is never replaced by an earlier one.
  it('aborts the request in flight when the choice changes', async () => {
    store.search(new BrowseQuery());
    store.search(new BrowseQuery().withOffer('wanted'));

    expect(api.calls[0]!.signal.aborted).toBe(true);
    api.calls[1]!.resolve(pageOf(['w'], null, counts));
    api.calls[0]!.resolve(pageOf(['a'], null, counts));
    await settle();

    expect(store.cards().map((view) => view.href)).toEqual(['/listings/w']);
  });

  it('does not ask again for the choice it shows or awaits', () => {
    store.search(new BrowseQuery().withOffer('wanted'));
    store.search(new BrowseQuery().withOffer('wanted'));

    expect(api.calls).toHaveLength(1);
  });

  // L2-006 with L2-002: a further page keeps the choice.
  it('asks for further pages with the same choice', async () => {
    store.search(new BrowseQuery().withOffer('wanted'));
    api.calls[0]!.resolve(pageOf(['a'], 'c2', counts));
    await settle();

    void store.loadMore('down', () => 0);

    expect(api.calls[1]!.filter.offer).toBe('wanted');
    expect(api.calls[1]!.cursor).toBe('c2');
  });

  it('asks again for the choice it shows when Try again is pressed', async () => {
    store.search(new BrowseQuery().withOffer('wanted'));
    api.calls[0]!.reject(unreachable);
    await settle();

    void store.loadFirst();

    expect(api.calls[1]!.filter.offer).toBe('wanted');
  });
});

describe('BrowseStore, while a person types', () => {
  let api: FakeListingsApi;
  let store: BrowseStore;
  const typed = (term: string) => new BrowseQuery().withTerm(term);

  beforeEach(() => {
    vi.useFakeTimers();
    api = new FakeListingsApi();
    TestBed.configureTestingModule({
      providers: [BrowseStore, { provide: LISTINGS_API, useValue: api }],
    });
    store = TestBed.inject(BrowseStore);
    store.search(new BrowseQuery());
  });

  afterEach(() => vi.useRealTimers());

  // L2-003 criterion 3: the list updates 300 ms after typing pauses.
  it('asks once, 300 ms after the last change of the term', async () => {
    store.search(typed('p'));
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);
    store.search(typed('pa'));
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);
    expect(api.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(api.calls).toHaveLength(2);
    expect(api.calls[1]!.filter.term).toBe('pa');
  });

  // L2-003 criterion 3: an earlier search in flight is cancelled as soon as the term changes,
  // and never replaces a later result.
  it('cancels the search in flight when the term changes', async () => {
    store.search(typed('park'));
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    store.search(typed('parking'));

    expect(api.calls[1]!.signal.aborted).toBe(true);

    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    api.calls[2]!.resolve(pageOf(['later']));
    api.calls[1]!.resolve(pageOf(['earlier']));
    await vi.advanceTimersByTimeAsync(0);

    expect(store.cards().map((view) => view.href)).toEqual(['/listings/later']);
  });

  // L2-003 criterion 6: Enter or Search searches without waiting.
  it('asks at once when the term is submitted, even while it waits', async () => {
    store.search(typed('hall'));
    store.search(typed('hall'), { now: true });

    expect(api.calls).toHaveLength(2);
    expect(api.calls[1]!.filter.term).toBe('hall');

    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    expect(api.calls).toHaveLength(2);
  });

  // L2-002 criterion 4: a change of the switch leaves at once and keeps the term.
  it('asks at once when the switch changes, with the term', () => {
    store.search(typed('hall').withOffer('for-rent'));

    expect(api.calls).toHaveLength(2);
    expect(api.calls[1]!.filter).toEqual({ offer: 'for-rent', kind: null, term: 'hall' });
  });

  it('does not ask again when only white space changes', async () => {
    store.search(typed('hall'));
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    store.search(typed('hall '));
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);

    expect(api.calls).toHaveLength(2);
  });

  // AGENTS.md, Lazy loading and memory: leaving clears the wait.
  it('clears the wait when Browse is left', () => {
    store.search(typed('hall'));

    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });
});
