import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpMessagesApi } from './http-messages-api';

const request = { text: 'Hi Dan', startDate: '2026-06-13', endDate: '2026-06-15' };

// send-message design: POST /api/listings/{listingId}/messages; leaving aborts it in flight.
describe('HttpMessagesApi', () => {
  let api: HttpMessagesApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpMessagesApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpMessagesApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('posts the message to its listing and answers what was sent', async () => {
    const sent = api.send('hall 1/2', request, new AbortController().signal);
    const call = backend.expectOne('/api/listings/hall%201%2F2/messages');

    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ id: 'm1', sentAt: '2026-06-08T15:00:00Z' });
    expect(await sent).toEqual({ id: 'm1', sentAt: '2026-06-08T15:00:00Z' });
  });

  it('cancels the request when its signal is aborted', async () => {
    const abort = new AbortController();
    const sent = api.send('hall', request, abort.signal);
    const call = backend.expectOne('/api/listings/hall/messages');

    abort.abort();

    expect(call.cancelled).toBe(true);
    await expect(sent).rejects.toBe(abort.signal.reason);
  });

  it('sends nothing for a signal already aborted', async () => {
    const abort = new AbortController();
    abort.abort();

    await expect(api.send('hall', request, abort.signal)).rejects.toBe(abort.signal.reason);
    backend.expectNone('/api/listings/hall/messages');
  });

  it('rejects with the failure', async () => {
    const sent = api.send('hall', request, new AbortController().signal);

    backend
      .expectOne('/api/listings/hall/messages')
      .flush(null, { status: 503, statusText: 'Unavailable' });

    await expect(sent).rejects.toMatchObject({ status: 503 });
  });
});
