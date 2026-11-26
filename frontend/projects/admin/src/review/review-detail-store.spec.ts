import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  REVIEW_QUEUE_API,
  type ReviewItemDetail,
  type ReviewQueueApi,
  type ReviewQueuePage,
} from '@rent/api';
import { ReviewDetailStore } from './review-detail-store';
import { SKELETON_DELAY_MS } from './review-queue-store';

function refusal(status: number, code: string | null): ApiError {
  return { status, code, retryAt: null, reportedAt: null, fields: null };
}

function member(id: string, name: string): ReviewItemDetail {
  return {
    id,
    kind: 'new-member',
    waitingSince: '2026-06-08T12:00:00Z',
    listing: null,
    report: null,
    member: {
      name,
      joinedAt: '2026-06-08T12:00:00Z',
      church: {
        name: 'Grace Community Church',
        city: 'Langley',
        isVerified: true,
        enteredByThisMember: false,
        enteredByName: null,
      },
      listings: { forRent: 0, wanted: 0, public: 0 },
      messagesSent: 0,
    },
  };
}

/** A ReviewQueueApi whose detail answers a test gives one at a time. */
class FakeReviewQueueApi implements ReviewQueueApi {
  readonly calls: {
    id: string;
    signal: AbortSignal;
    resolve: (detail: ReviewItemDetail) => void;
    reject: (error: unknown) => void;
  }[] = [];

  page(): Promise<ReviewQueuePage> {
    return Promise.reject(new Error('Not asked in these tests.'));
  }

  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail> {
    return new Promise((resolve, reject) => this.calls.push({ id, signal, resolve, reject }));
  }

  last() {
    return this.calls[this.calls.length - 1]!;
  }
}

let api: FakeReviewQueueApi;

function create(): ReviewDetailStore {
  api = new FakeReviewQueueApi();
  TestBed.configureTestingModule({
    providers: [ReviewDetailStore, { provide: REVIEW_QUEUE_API, useValue: api }],
  });
  return TestBed.inject(ReviewDetailStore);
}

function name(store: ReviewDetailStore): string | null {
  const view = store.view();
  return view?.kind === 'member' ? view.name : null;
}

// view-review-queue design; ADR 0024; L2-033.
describe('ReviewDetailStore', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the item it opens', async () => {
    const store = create();

    const opening = store.open('a');
    api.last().resolve(member('a', 'Dr. Alicia Gomez'));
    await opening;

    expect(store.state()).toBe('loaded');
    expect(name(store)).toBe('Dr. Alicia Gomez');
  });

  it('asks nothing for the item already open', async () => {
    const store = create();
    const opening = store.open('a');
    api.last().resolve(member('a', 'Dr. Alicia Gomez'));
    await opening;

    await store.open('a');

    expect(api.calls).toHaveLength(1);
  });

  it('aborts the earlier request, so a slower answer never replaces a newer one', async () => {
    const store = create();
    const first = store.open('a');
    const earlier = api.last();
    const second = store.open('b');

    expect(earlier.signal.aborted).toBe(true);
    api.last().resolve(member('b', 'Marcus Lee'));
    await second;
    earlier.resolve(member('a', 'Dr. Alicia Gomez'));
    await first;

    expect(name(store)).toBe('Marcus Lee');
  });

  it.each([
    [refusal(0, null), 'failed'],
    [refusal(503, 'unexpected'), 'failed'],
    [refusal(404, 'not_found'), 'gone'],
  ] as const)('after %o it is %s', async (error, state) => {
    const store = create();

    const opening = store.open('a');
    api.last().reject(error);
    await opening;

    expect(store.state()).toBe(state);
  });

  it('tries the same item again after it failed', async () => {
    const store = create();
    const failing = store.open('a');
    api.last().reject(refusal(0, null));
    await failing;

    const again = store.retry();
    expect(api.last().id).toBe('a');
    api.last().resolve(member('a', 'Dr. Alicia Gomez'));
    await again;

    expect(store.state()).toBe('loaded');
  });

  it('shows its shape only after 300 ms (L2-033, criteria 1 and 5)', () => {
    vi.useFakeTimers();
    const store = create();
    void store.open('a');

    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(store.skeleton()).toBe(false);
    vi.advanceTimersByTime(1);

    expect(store.skeleton()).toBe(true);
  });

  it('closes when the panel is hidden, aborting what it asked', () => {
    const store = create();
    void store.open('a');
    const { signal } = api.last();

    store.close();

    expect(signal.aborted).toBe(true);
    expect(store.state()).toBe('idle');
    expect(store.id()).toBeNull();
  });

  it('aborts its request and clears its timer when the admin leaves', () => {
    vi.useFakeTimers();
    const store = create();
    void store.open('a');
    const { signal } = api.last();

    TestBed.resetTestingModule();

    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(store).toBeDefined();
  });
});
