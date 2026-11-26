import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpPhotosApi } from './http-photos-api';

// add-photos design: one multipart field, `file`; aborting cancels the request in flight.
describe('HttpPhotosApi', () => {
  let api: HttpPhotosApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpPhotosApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpPhotosApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('uploads the file as the form field "file" and answers the photo', async () => {
    const file = new File(['jpeg'], 'garage.jpg', { type: 'image/jpeg' });
    const uploaded = api.upload(file, new AbortController().signal);
    const request = backend.expectOne({ method: 'POST', url: '/api/photos' });
    const body = request.request.body as FormData;

    expect((body.get('file') as File).name).toBe('garage.jpg');
    const photo = { id: 'p1', urls: { card: 'c', gallery: 'g', thumb: 't' } };
    request.flush(photo);
    expect(await uploaded).toEqual(photo);
  });

  it('cancels an upload when its signal aborts', async () => {
    const controller = new AbortController();
    const uploaded = api.upload(new File(['x'], 'a.jpg'), controller.signal);
    const request = backend.expectOne('/api/photos');

    controller.abort();

    await expect(uploaded).rejects.toBeDefined();
    expect(request.cancelled).toBe(true);
  });

  it('deletes a photo by its identifier', async () => {
    const removed = api.remove('p 1', new AbortController().signal);

    backend.expectOne({ method: 'DELETE', url: '/api/photos/p%201' }).flush(null);
    await removed;
  });
});
