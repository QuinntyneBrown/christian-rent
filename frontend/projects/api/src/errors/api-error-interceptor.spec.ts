import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiErrorInterceptor } from './api-error-interceptor';

describe('apiErrorInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('turns a failed response into an ApiError', async () => {
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(http.get('/api/listings/1')).catch((error: unknown) => error);
    backend
      .expectOne('/api/listings/1')
      .flush({ status: 404, code: 'not_found' }, { status: 404, statusText: 'Not Found' });

    expect(await result).toEqual({
      status: 404,
      code: 'not_found',
      retryAt: null,
      reportedAt: null,
      fields: null,
    });
    backend.verify();
  });

  it('passes a successful response through untouched', async () => {
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(http.get('/api/churches'));
    backend.expectOne('/api/churches').flush([{ id: '1' }]);

    expect(await result).toEqual([{ id: '1' }]);
  });
});
