import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SESSION, type SessionState, apiErrorInterceptor } from '@rent/api';
import { firstValueFrom } from 'rxjs';
import { sessionExpiryInterceptor } from './session-expiry-interceptor';

// L2-040 criterion 2: which refusals end the session on the screen, one case per row.
describe('sessionExpiryInterceptor', () => {
  const cases: [string, SessionState, string, number, string, boolean][] = [
    [
      'a member action refused while signed in',
      'signed-in',
      '/api/listings',
      401,
      'not_signed_in',
      true,
    ],
    [
      'the same while nobody was signed in',
      'signed-out',
      '/api/listings',
      401,
      'not_signed_in',
      false,
    ],
    ['asking who is signed in', 'signed-in', '/api/members/me', 401, 'not_signed_in', false],
    ['a refused sign-in', 'signed-in', '/api/session', 401, 'sign_in_failed', false],
    [
      'an Admin request refused while signed in',
      'signed-in',
      '/api/admin/review-queue',
      401,
      'not_signed_in',
      true,
    ],
    ['a refusal for another reason', 'signed-in', '/api/listings', 403, 'not_a_member', false],
  ];

  it.each(cases)('after %s', async (_case, state, url, status, code, expires) => {
    const expire = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION, useValue: { state: signal(state), expire } },
        provideHttpClient(withInterceptors([sessionExpiryInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const answer = firstValueFrom(TestBed.inject(HttpClient).get(url)).catch((error) => error);

    TestBed.inject(HttpTestingController)
      .expectOne(url)
      .flush({ code }, { status, statusText: 'Refused' });

    expect((await answer).code).toBe(code);
    expect(expire).toHaveBeenCalledTimes(expires ? 1 : 0);
  });
});
