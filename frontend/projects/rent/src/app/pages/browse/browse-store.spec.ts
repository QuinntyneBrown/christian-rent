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
