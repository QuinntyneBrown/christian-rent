import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpListingsApi } from './http-listings-api';
import type { ListingsPage } from './listing-card';
import { NO_FILTER } from './listings-api';

const empty: ListingsPage = {
  items: [],
  nextCursor: null,
  counts: { everything: 0, forRent: 0, wanted: 0 },
};

// browse-listings design: one page by cursor; leaving Browse aborts the request in flight.
// search-and-filter design: the filter travels with every page.
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
    const page = api.browse(NO_FILTER, null, new AbortController().signal);
    const request = backend.expectOne((r) => r.url === '/api/listings');

    expect(request.request.params.has('cursor')).toBe(false);
    request.flush(empty);
    expect(await page).toEqual(empty);
  });

  it('asks for a later page by its cursor', async () => {
    const page = api.browse(NO_FILTER, 'c2', new AbortController().signal);

    backend.expectOne('/api/listings?cursor=c2').flush(empty);
    expect(await page).toEqual(empty);
  });

  // ADR 0015: the switch, the kind filter and the term, each omitted when empty.
  it('sends the filter as show, kind and q, with the cursor', async () => {
    const page = api.browse(
      { offer: 'wanted', kind: 'thing', term: 'folding chairs' },
      'c2',
      new AbortController().signal,
    );

    backend
      .expectOne('/api/listings?show=wanted&kind=thing&q=folding%20chairs&cursor=c2')
      .flush(empty);
    expect(await page).toEqual(empty);
  });

  it('cancels the request when it is aborted', async () => {
    const controller = new AbortController();
    const page = api.browse(NO_FILTER, null, controller.signal).catch((error: unknown) => error);
    const request = backend.expectOne('/api/listings');

    controller.abort();

    expect(request.cancelled).toBe(true);
    expect(((await page) as DOMException).name).toBe('AbortError');
  });

  it('sends nothing when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(api.browse(NO_FILTER, null, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    backend.expectNone('/api/listings');
  });

  it('asks for one listing by its identifier, encoded', async () => {
    const listing = api.get('a b/c', new AbortController().signal);

    const request = backend.expectOne('/api/listings/a%20b%2Fc');
    request.flush({ id: 'a b/c' });
    expect(await listing).toEqual({ id: 'a b/c' });
  });

  it('cancels a listing’s request when it is aborted', async () => {
    const controller = new AbortController();
    const listing = api.get('l1', controller.signal).catch((error: unknown) => error);
    const request = backend.expectOne('/api/listings/l1');

    controller.abort();

    expect(request.cancelled).toBe(true);
    expect(((await listing) as DOMException).name).toBe('AbortError');
  });

  // publish-listing design: POST /api/listings with the request; aborting cancels it.
  it('posts a listing and answers what the API answers', async () => {
    const request = {
      clientRequestId: 'id-1',
      offer: 'wanted' as const,
      kind: 'thing' as const,
      title: 'Van',
      priceAmount: null,
      pricePeriod: null,
      whenText: 'Weekends',
      startDate: null,
      endDate: null,
      area: 'Langley',
      note: null,
      photoIds: [],
    };
    const posted = api.post(request, new AbortController().signal);
    const sent = backend.expectOne('/api/listings');

    expect(sent.request.method).toBe('POST');
    expect(sent.request.body).toEqual(request);
    sent.flush({ id: 'l1', status: 'waiting-for-review' });
    expect(await posted).toEqual({ id: 'l1', status: 'waiting-for-review' });
  });

  it('cancels a post in flight when its signal aborts', async () => {
    const controller = new AbortController();
    const posted = api.post({} as never, controller.signal);
    const sent = backend.expectOne('/api/listings');

    controller.abort();

    await expect(posted).rejects.toBeDefined();
    expect(sent.cancelled).toBe(true);
  });
});
