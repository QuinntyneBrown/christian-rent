import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpReviewQueueApi } from './http-review-queue-api';

// view-review-queue design: the two reads of the review queue.
describe('HttpReviewQueueApi', () => {
  let api: HttpReviewQueueApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpReviewQueueApi],
    });
    api = TestBed.inject(HttpReviewQueueApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the first page with no cursor, and for a later one by its cursor', async () => {
    const signal = new AbortController().signal;
    const first = api.page(null, signal);
    const request = http.expectOne('/api/review-queue');
    request.flush({ items: [], nextCursor: null, waitingCount: 0 });
    await expect(first).resolves.toEqual({ items: [], nextCursor: null, waitingCount: 0 });

    void api.page('next+1', signal);

    http
      .expectOne(
        (sent) => sent.url === '/api/review-queue' && sent.params.get('cursor') === 'next+1',
      )
      .flush({ items: [], nextCursor: null, waitingCount: 0 });
  });

  it('asks for one item by its identifier, as a path segment', async () => {
    const item = api.item('a/b', new AbortController().signal);

    http.expectOne('/api/review-queue/a%2Fb').flush({ id: 'a/b' });

    await expect(item).resolves.toEqual({ id: 'a/b' });
  });

  it('sends a decision with the version of the item it was made on', async () => {
    const decided = api.decide('a/b', 'keep', 3, new AbortController().signal);

    const sent = http.expectOne('/api/review-queue/a%2Fb/decision');
    expect(sent.request.method).toBe('POST');
    expect(sent.request.body).toEqual({ decision: 'keep', version: 3 });
    sent.flush({ closedItemIds: ['a/b'] });

    await expect(decided).resolves.toEqual({ closedItemIds: ['a/b'] });
  });

  // The offset's "+" must reach the API as it is, not as a space.
  it('asks what arrived since an instant, encoded whole', async () => {
    const arrived = api.arrivals('2026-06-08T19:00:00+00:00', new AbortController().signal);

    http
      .expectOne('/api/review-queue/arrivals?since=2026-06-08T19%3A00%3A00%2B00%3A00')
      .flush({ newListings: 1, reports: 0, newMembers: 0 });

    await expect(arrived).resolves.toEqual({ newListings: 1, reports: 0, newMembers: 0 });
  });

  // Lesson L33: the abort is observed on the request itself.
  it('cancels the request in flight when it is aborted', async () => {
    const abort = new AbortController();
    const item = api.item('1', abort.signal);
    const request = http.expectOne('/api/review-queue/1');

    abort.abort();

    await expect(item).rejects.toMatchObject({ name: 'AbortError' });
    expect(request.cancelled).toBe(true);
  });

  it('sends nothing for a signal already aborted', async () => {
    const abort = new AbortController();
    abort.abort();

    await expect(api.page(null, abort.signal)).rejects.toMatchObject({ name: 'AbortError' });

    http.expectNone('/api/review-queue');
  });
});
