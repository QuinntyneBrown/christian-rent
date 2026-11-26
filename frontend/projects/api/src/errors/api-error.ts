import type { HttpErrorResponse } from '@angular/common/http';

/**
 * A refusal or failure from the backend, in the one shape every screen branches on
 * (enforce-access design). `code` is null when the response is not a ProblemDetails, for example
 * when the backend cannot be reached (`status` 0). The ProblemDetails' title and detail are
 * never kept, because they are never shown (L2-025, criterion 4).
 */
export interface ApiError {
  readonly status: number;
  readonly code: string | null;
  /** When a limit lifts, as an ISO instant. */
  readonly retryAt: string | null;
  /** The first message for each field of a `validation_failed` refusal. */
  readonly fields: Readonly<Record<string, string>> | null;
}

/** True when a value is an ApiError, as the interceptor throws them. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    'code' in value &&
    'retryAt' in value &&
    'fields' in value
  );
}

/** Converts a failed HTTP response into an ApiError. Pure; `now` resolves `Retry-After`. */
export function toApiError(response: HttpErrorResponse, now: Date): ApiError {
  const body = isRecord(response.error) ? response.error : null;
  return {
    status: response.status,
    code: typeof body?.['code'] === 'string' ? body['code'] : null,
    retryAt: readRetryAt(body, response, now),
    fields: readFields(body),
  };
}

function readRetryAt(
  body: Record<string, unknown> | null,
  response: HttpErrorResponse,
  now: Date,
): string | null {
  if (typeof body?.['retryAt'] === 'string') {
    return body['retryAt'];
  }
  const seconds = Number(response.headers?.get('retry-after'));
  if (response.headers?.has('retry-after') && Number.isFinite(seconds) && seconds >= 0) {
    return new Date(now.getTime() + seconds * 1000).toISOString();
  }
  return null;
}

function readFields(body: Record<string, unknown> | null): Record<string, string> | null {
  const errors = body?.['errors'];
  if (!isRecord(errors)) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      fields[field] = messages[0];
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
