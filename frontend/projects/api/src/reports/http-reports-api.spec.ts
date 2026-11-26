import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpReportsApi } from './http-reports-api';

const request = { reason: 'scam', note: 'Pay first.' } as const;

// report-listing design: POST /api/listings/{listingId}/reports; leaving aborts it in flight.
describe('HttpReportsApi', () => {
  let api: HttpReportsApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpReportsApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpReportsApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('posts the report to its listing and answers when it was filed', async () => {
    const reported = api.report('hall 1/2', request, new AbortController().signal);
    const call = backend.expectOne('/api/listings/hall%201%2F2/reports');

    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ reportedAt: '2026-06-08T15:00:00Z' });
    expect(await reported).toEqual({ reportedAt: '2026-06-08T15:00:00Z' });
  });

  it('cancels the request when its signal is aborted', async () => {
    const abort = new AbortController();
    const reported = api.report('hall', request, abort.signal);
    const call = backend.expectOne('/api/listings/hall/reports');

    abort.abort();

    expect(call.cancelled).toBe(true);
    await expect(reported).rejects.toBe(abort.signal.reason);
  });

  it('sends nothing for a signal already aborted', async () => {
    const abort = new AbortController();
    abort.abort();

    await expect(api.report('hall', request, abort.signal)).rejects.toBe(abort.signal.reason);
    backend.expectNone('/api/listings/hall/reports');
  });

  it('rejects with the failure', async () => {
    const reported = api.report('hall', request, new AbortController().signal);

    backend
      .expectOne('/api/listings/hall/reports')
      .flush(null, { status: 503, statusText: 'Unavailable' });

    await expect(reported).rejects.toMatchObject({ status: 503 });
  });
});
