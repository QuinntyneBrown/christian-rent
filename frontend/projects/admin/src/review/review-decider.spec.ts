import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  REVIEW_QUEUE_API,
  type ReviewDecision,
  type ReviewItemDetail,
  type ReviewQueueApi,
  type ReviewQueuePage,
} from '@rent/api';
import { ReviewDecider } from './review-decider';
import { ReviewDetailStore } from './review-detail-store';
import { ReviewQueueStore } from './review-queue-store';

function refusal(code: string | null, decided: ApiError['decided'] = null): ApiError {
  return {
    status: code === null ? 0 : 409,
    code,
    retryAt: null,
    reportedAt: null,
    decided,
    fields: null,
  };
}

function detailOf(id: string): ReviewItemDetail {
  return {
    id,
    kind: 'new-member',
    decisions: ['approve', 'remove'],
    waitingSince: '2026-06-08T12:00:00Z',
    listing: null,
    report: null,
    member: {
      name: `Member ${id}`,
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

const PAGE: ReviewQueuePage = {
  items: ['a', 'b', 'c'].map((id) => ({
    id,
    kind: 'new-member',
    title: `Member ${id}`,
    who: 'Grace Community Church',
    waitingSince: '2026-06-08T12:00:00Z',
    offer: null,
    thumbUrl: null,
  })),
  nextCursor: null,
  waitingCount: 3,
};

/** A ReviewQueueApi whose decisions a test answers one at a time. */
class FakeReviewQueueApi implements ReviewQueueApi {
  readonly decisions: {
    id: string;
    decision: ReviewDecision;
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];

  page(): Promise<ReviewQueuePage> {
    return Promise.resolve(PAGE);
  }

  item(id: string): Promise<ReviewItemDetail> {
    return Promise.resolve(detailOf(id));
  }

  decide(id: string, decision: ReviewDecision): Promise<void> {
    return new Promise((resolve, reject) =>
      this.decisions.push({ id, decision, resolve: () => resolve(), reject }),
    );
  }

  last() {
    return this.decisions[this.decisions.length - 1]!;
  }
}

let api: FakeReviewQueueApi;
let queue: ReviewQueueStore;
/** What the selection was changed to, in order, with the queue's ids at that moment. */
let selections: { id: string | null; listed: string[] }[];
const select = (id: string | null) => {
  selections.push({ id, listed: queue.items().map((item) => item.id) });
  return Promise.resolve(true);
};

async function create(open = 'b'): Promise<ReviewDecider> {
  api = new FakeReviewQueueApi();
  selections = [];
  TestBed.configureTestingModule({
    providers: [
      ReviewQueueStore,
      ReviewDetailStore,
      ReviewDecider,
      { provide: REVIEW_QUEUE_API, useValue: api },
    ],
  });
  queue = TestBed.inject(ReviewQueueStore);
  await queue.load();
  await TestBed.inject(ReviewDetailStore).open(open);
  return TestBed.inject(ReviewDecider);
}

// decide-review-item design; L2-020 criteria 11 to 13; ADR 0025.
describe('ReviewDecider', () => {
  it('selects the next item, then drops the decided one', async () => {
    const decider = await create();

    const deciding = decider.decide('approve', select);
    expect(decider.deciding()).toBe('approve');
    api.last().resolve();

    expect(await deciding).toBe('decided');
    expect(api.last()).toMatchObject({ id: 'b', decision: 'approve' });
    expect(selections).toEqual([{ id: 'c', listed: ['a', 'b', 'c'] }]);
    expect(queue.items().map((item) => item.id)).toEqual(['a', 'c']);
    expect(decider.deciding()).toBeNull();
  });

  it('sends one decision at a time', async () => {
    const decider = await create();

    const first = decider.decide('approve', select);
    const second = await decider.decide('remove', select);
    api.last().resolve();
    await first;

    expect(second).toBeNull();
    expect(api.decisions).toHaveLength(1);
  });

  it('keeps the item open with a warning when another admin decided first', async () => {
    const decider = await create();
    const decidedAt = new Date(2026, 5, 8, 12, 14).toISOString();

    const deciding = decider.decide('remove', select);
    api.last().reject(refusal('already_decided', { decision: 'approve', decidedAt }));

    expect(await deciding).toBe('already');
    expect(selections).toEqual([{ id: 'b', listed: ['a', 'b', 'c'] }]);
    expect(queue.items().map((item) => item.id)).toEqual(['a', 'c']);
    expect(decider.elsewhere()).toEqual({
      id: 'b',
      text: 'Another admin approved it at 12:14 p.m. Your decision was not applied.',
      next: 'c',
    });

    await decider.next(select);

    expect(selections[1]).toEqual({ id: 'c', listed: ['a', 'c'] });
    expect(decider.elsewhere()).toBeNull();
  });

  it('changes nothing when the decision is not saved', async () => {
    const decider = await create();

    const deciding = decider.decide('approve', select);
    api.last().reject(refusal(null));

    expect(await deciding).toBe('failed');
    expect(selections).toEqual([]);
    expect(queue.items().map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(decider.deciding()).toBeNull();
  });

  it('forgets the warning once another item opens', async () => {
    const decider = await create();
    const deciding = decider.decide('approve', select);
    api
      .last()
      .reject(refusal('already_decided', { decision: 'keep', decidedAt: '2026-06-08T12:14:00Z' }));
    await deciding;

    decider.forget('b');
    expect(decider.elsewhere()).not.toBeNull();
    decider.forget('c');
    expect(decider.elsewhere()).toBeNull();
  });
});
