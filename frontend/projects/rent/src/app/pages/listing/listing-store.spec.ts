import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  LISTINGS_API,
  type ListingDetail,
  type ListingsApi,
  type ListingsPage,
  type PostedListing,
} from '@rent/api';
import { ListingStore, SKELETON_DELAY_MS } from './listing-store';

function detail(id: string): ListingDetail {
  return {
    id,
    offer: 'for-rent',
    kind: 'space',
    title: `Listing ${id}`,
    price: { amount: 45, period: 'hour' },
    when: { text: 'Weekdays', start: null, end: null },
    area: 'Langley',
    distanceKm: null,
    note: null,
    postedAt: '2026-06-08T15:00:00Z',
    photos: [],
    poster: {
      name: 'Pastor Dan Whitaker',
      isVerified: true,
      memberSince: 2023,
      church: { name: 'Grace Community Church', isVerified: true },
    },
    isOwn: false,
    reportedAt: null,
  };
}

function refusal(status: number, code: string | null): ApiError {
  return { status, code, retryAt: null, reportedAt: null, fields: null };
}

/** A ListingsApi whose answers a test gives one at a time. */
class FakeListingsApi implements ListingsApi {
  readonly calls: {
    id: string;
    signal: AbortSignal;
    resolve: (listing: ListingDetail) => void;
    reject: (error: unknown) => void;
  }[] = [];

  browse(): Promise<ListingsPage> {
    return Promise.reject(new Error('Listing browses nothing.'));
  }

  get(id: string, signal: AbortSignal): Promise<ListingDetail> {
    return new Promise((resolve, reject) => this.calls.push({ id, signal, resolve, reject }));
  }

  post(): Promise<PostedListing> {
    return Promise.reject(new Error('Listing posts nothing.'));
  }
}

// read-listing design: the Listing screen's states (L2-007, criterion 4; L2-033).
describe('ListingStore', () => {
  let api: FakeListingsApi;
  let store: ListingStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T15:00:00Z'));
    api = new FakeListingsApi();
    TestBed.configureTestingModule({
      providers: [ListingStore, { provide: LISTINGS_API, useValue: api }],
    });
    store = TestBed.inject(ListingStore);
  });

  afterEach(() => vi.useRealTimers());

  it('shows the listing once it has loaded, written for the screen', async () => {
    const loading = store.load('l1');
    expect(store.state()).toBe('loading');
    expect(store.announcement()).toBe('Loading listing');

    api.calls[0]!.resolve(detail('l1'));
    await loading;

    expect(api.calls[0]!.id).toBe('l1');
    expect(store.state()).toBe('loaded');
    expect(store.view()?.title).toBe('Listing l1');
    expect(store.view()?.posted).toBe('Posted 2 days ago');
  });

  it('shows no skeleton when the listing answers within 300 ms, and one after', async () => {
    const loading = store.load('l1');
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(store.skeleton()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(store.skeleton()).toBe(true);

    api.calls[0]!.resolve(detail('l1'));
    await loading;
    expect(store.skeleton()).toBe(false);
  });

  it.each([
    ['not_found', 404, 'not-found', 'This listing isn’t here.'],
    ['an unreachable backend', 0, 'failed', 'We couldn’t load this listing.'],
    ['any other refusal', 503, 'failed', 'We couldn’t load this listing.'],
  ])('answers %s with its state', async (_case, status, state, announcement) => {
    const loading = store.load('l1');
    api.calls[0]!.reject(refusal(status, status === 404 ? 'not_found' : null));
    await loading;

    expect(store.state()).toBe(state);
    expect(store.view()).toBeNull();
    expect(store.announcement()).toBe(announcement);
  });

  it('loads the same listing again on "Try again"', async () => {
    const first = store.load('l1');
    api.calls[0]!.reject(refusal(0, null));
    await first;

    const again = store.load();
    expect(store.state()).toBe('loading');
    api.calls[1]!.resolve(detail('l1'));
    await again;

    expect(api.calls[1]!.id).toBe('l1');
    expect(store.state()).toBe('loaded');
  });

  it('aborts the request for the listing it leaves when another is opened', async () => {
    void store.load('l1');
    const second = store.load('l2');

    expect(api.calls[0]!.signal.aborted).toBe(true);
    api.calls[0]!.reject(new DOMException('Aborted', 'AbortError'));
    api.calls[1]!.resolve(detail('l2'));
    await second;

    expect(store.view()?.title).toBe('Listing l2');
  });

  it('aborts its request and clears its timer when the person leaves', () => {
    void store.load('l1');

    TestBed.resetTestingModule();

    expect(api.calls[0]!.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets an unexpected error through, as a bug', async () => {
    const loading = store.load('l1');
    api.calls[0]!.reject(new TypeError('bug'));

    await expect(loading).rejects.toThrow('bug');
  });
});
