import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  LISTINGS_API,
  type ListingsApi,
  type MemberSummary,
  type PostListingRequest,
  type PostedListing,
  SESSION,
} from '@rent/api';
import { DRAFT_KEY } from '@rent/domain';
import { signal } from '@angular/core';
import { MemberGate } from '../../members/member-gate';
import { PostStore } from './post-store';

const sarah: MemberSummary = {
  id: 'm1',
  name: 'Sarah Kim',
  initials: 'SK',
  churchName: 'Grace Community Church',
  isAdmin: false,
  isVerified: false,
};

/** A ListingsApi whose posts a test answers one at a time. */
class FakeListingsApi implements Pick<ListingsApi, 'post'> {
  readonly calls: {
    request: PostListingRequest;
    signal: AbortSignal;
    resolve: (posted: PostedListing) => void;
    reject: (error: unknown) => void;
  }[] = [];

  post(request: PostListingRequest, signal: AbortSignal): Promise<PostedListing> {
    return new Promise((resolve, reject) => this.calls.push({ request, signal, resolve, reject }));
  }
}

function refusal(status: number, code: string | null, retryAt: string | null = null): ApiError {
  return { status, code, retryAt, reportedAt: null, fields: null };
}

// publish-listing design (PostStore.publish); L2-012; ADR 0019.
describe('PostStore', () => {
  let api: FakeListingsApi;
  let member: boolean;
  let store: PostStore;

  beforeEach(() => {
    sessionStorage.clear();
    api = new FakeListingsApi();
    member = true;
    TestBed.configureTestingModule({
      providers: [
        PostStore,
        { provide: LISTINGS_API, useValue: api },
        {
          provide: SESSION,
          useValue: { member: signal(sarah), refresh: vi.fn(), ready: () => Promise.resolve() },
        },
        { provide: MemberGate, useValue: { requireMember: () => Promise.resolve(member) } },
      ],
    });
    store = TestBed.inject(PostStore);
  });

  function fill(): void {
    store.patch({
      title: 'Pressure washer and drill kit',
      price: '25',
      whenText: 'Most weekends',
      area: 'Willoughby, Langley',
    });
  }

  /** Lets the gate answer and the request start. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('sends nothing while a field is invalid, and marks it', async () => {
    await store.publish();

    expect(api.calls).toHaveLength(0);
    expect(store.submitState()).toBe('idle');
    expect(store.summary().map((entry) => entry.field)).toEqual([
      'title',
      'price',
      'whenText',
      'area',
    ]);
  });

  it('sends nothing for a person who does not become a member', async () => {
    member = false;
    fill();

    await store.publish();

    expect(api.calls).toHaveLength(0);
    expect(store.submitState()).toBe('idle');
  });

  it('is busy while sent, ignores a second publish, then is sent and forgets the draft', async () => {
    fill();
    TestBed.tick();
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    const publishing = store.publish();
    void store.publish();
    await settle();

    expect(store.submitState()).toBe('submitting');
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]!.request.title).toBe('Pressure washer and drill kit');
    api.calls[0]!.resolve({ id: 'l1', status: 'waiting-for-review' });
    await publishing;

    expect(store.submitState()).toBe('sent');
    expect(store.sentCard()?.title).toBe('Pressure washer and drill kit');
    expect(store.sentCard()?.church).toBe('Grace Community Church');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it.each([
    [refusal(0, null), 'failed'],
    [refusal(500, null), 'failed'],
    [refusal(429, 'rate_limited'), 'failed'],
    [refusal(400, 'validation_failed'), 'failed'],
    [refusal(429, 'post_limit_reached', '2026-06-09T16:15:00Z'), 'limited'],
  ] as const)('keeps everything after a refusal %o, as %s', async (error, state) => {
    fill();
    const publishing = store.publish();
    await settle();
    const requestId = api.calls[0]!.request.clientRequestId;

    api.calls[0]!.reject(error);
    await publishing;

    expect(store.submitState()).toBe(state);
    expect(store.draft().title).toBe('Pressure washer and drill kit');
    expect(store.retryAt()).toBe(error.retryAt);

    // "Try again" repeats the same request (L2-012, criteria 4 and 5).
    void store.publish();
    await settle();
    expect(api.calls[1]?.request.clientRequestId).toBe(requestId);
  });

  it('aborts a post in flight when Post is left, and keeps the draft', async () => {
    fill();
    void store.publish();
    await settle();

    TestBed.resetTestingModule();

    expect(api.calls[0]!.signal.aborted).toBe(true);
    expect(sessionStorage.getItem(DRAFT_KEY)).toContain('Pressure washer and drill kit');
  });

  it('starts another draft for the same offer once sent', async () => {
    store.setOffer('wanted');
    fill();
    const publishing = store.publish();
    await settle();
    const first = api.calls[0]!.request.clientRequestId;
    api.calls[0]!.resolve({ id: 'l1', status: 'waiting-for-review' });
    await publishing;

    store.startAnother();

    expect(store.submitState()).toBe('idle');
    expect(store.draft()).toMatchObject({ offer: 'wanted', title: '' });
    expect(store.draft().clientRequestId).not.toBe(first);
    expect(store.summary()).toEqual([]);
  });
});
