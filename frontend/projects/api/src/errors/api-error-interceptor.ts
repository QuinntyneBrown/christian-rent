import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toApiError } from './api-error';

/**
 * Converts every failed response into an ApiError, so screens branch on `code` and show their
 * own generic copy (L2-025, criterion 4). Bound in app.config.ts.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) =>
      throwError(() =>
        error instanceof HttpErrorResponse ? toApiError(error, new Date()) : error,
      ),
    ),
  );
