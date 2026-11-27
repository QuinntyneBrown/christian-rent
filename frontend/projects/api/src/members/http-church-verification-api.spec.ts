import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpChurchVerificationApi } from './http-church-verification-api';

// verify-members-and-churches design: confirming a church (ADR 0031).
describe('HttpChurchVerificationApi', () => {
  let api: HttpChurchVerificationApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpChurchVerificationApi],
    });
    api = TestBed.inject(HttpChurchVerificationApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts to the church by its identifier, as a path segment, with no body', async () => {
    const confirmed = api.verify('a/b', new AbortController().signal);

    const sent = http.expectOne('/api/admin/churches/a%2Fb/verification');
    expect(sent.request.method).toBe('POST');
    expect(sent.request.body).toBeNull();
    sent.flush(null, { status: 204, statusText: 'No Content' });

    await expect(confirmed).resolves.toBeUndefined();
  });

  it('rejects with what the API refused', async () => {
    const confirmed = api.verify('st-pauls', new AbortController().signal);

    http
      .expectOne('/api/admin/churches/st-pauls/verification')
      .flush({ code: 'not_found' }, { status: 404, statusText: 'Not Found' });

    await expect(confirmed).rejects.toBeTruthy();
  });

  it('stops a request in flight when its signal is aborted', async () => {
    const leaving = new AbortController();
    const confirmed = api.verify('st-pauls', leaving.signal);
    const sent = http.expectOne('/api/admin/churches/st-pauls/verification');

    leaving.abort();

    expect(sent.cancelled).toBe(true);
    await expect(confirmed).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('sends nothing when its signal is already aborted', async () => {
    const left = new AbortController();
    left.abort();

    await expect(api.verify('st-pauls', left.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    http.expectNone('/api/admin/churches/st-pauls/verification');
  });
});
