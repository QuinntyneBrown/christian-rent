import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SESSION, SESSION_PATHS, isApiError } from '@rent/api';
import { catchError, throwError } from 'rxjs';

/**
 * A session that ended while a screen was open (L2-040, criterion 2; ADR 0029): a request made
 * while signed in that is refused as `not_signed_in` takes the person to the sign-in page, to
 * come back where they were. The session's own requests never count. It sits before
 * `apiErrorInterceptor`, so it sees the `ApiError` that interceptor makes; the error still
 * reaches the screen, which keeps what was written.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SESSION);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        isApiError(error) &&
        error.status === 401 &&
        error.code === 'not_signed_in' &&
        session.state() === 'signed-in' &&
        !SESSION_PATHS.some((path) => new URL(request.url, 'http://x').pathname === path)
      ) {
        session.expire();
      }
      return throwError(() => error);
    }),
  );
};
