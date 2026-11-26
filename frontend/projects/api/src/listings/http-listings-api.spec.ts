import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpListingsApi } from './http-listings-api';
import type { ListingsPage } from './listing-card';

const empty: ListingsPage = {
  items: [],
  nextCursor: null,
  counts: { everything: 0, forRent: 0, wanted: 0 },
};

// browse-listings design: one page by cursor; leaving Browse aborts the request in flight.
describe('HttpListingsApi', () => {
  let api: HttpListingsApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpListingsApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpListingsApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('asks for the first page with no cursor', async () => {
    const page = api.browse(null, new AbortController().signal);
    const request = backend.expectOne((r) => r.url === '/api/listings');

    expect(request.request.params.has('cursor')).toBe(false);
    request.flush(empty);
    expect(await page).toEqual(empty);
  });

  it('asks for a later page by its cursor', async () => {
    const page = api.browse('c2', new AbortController().signal);

    backend.expectOne('/api/listings?cursor=c2').flush(empty);
    expect(await page).toEqual(empty);
  });

  it('cancels the request when it is aborted', async () => {
    const controller = new AbortController();
    const page = api.browse(null, controller.signal).catch((error: unknown) => error);
    const request = backend.expectOne('/api/listings');

    controller.abort();

    expect(request.cancelled).toBe(true);
    expect(((await page) as DOMException).name).toBe('AbortError');
  });

  it('sends nothing when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(api.browse(null, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    backend.expectNone('/api/listings');
  });
});
