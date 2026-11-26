import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { toApiError } from './api-error';

const NOW = new Date('2026-06-08T15:00:00Z');

function problem(status: number, body: unknown, headers?: Record<string, string>) {
  return new HttpErrorResponse({
    status,
    error: body,
    headers: new HttpHeaders({ 'content-type': 'application/problem+json', ...headers }),
  });
}

describe('toApiError', () => {
  // One case per row: a screen branches on `code`, never on the title or detail (L2-025 criterion 4).
  const cases: [string, HttpErrorResponse, ReturnType<typeof toApiError>][] = [
    [
      'the backend cannot be reached',
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
      { status: 0, code: null, retryAt: null, reportedAt: null, decided: null, fields: null },
    ],
    [
      'a ProblemDetails with a code',
      problem(401, { title: 'Sign in', status: 401, code: 'not_signed_in' }),
      {
        status: 401,
        code: 'not_signed_in',
        retryAt: null,
        reportedAt: null,
        decided: null,
        fields: null,
      },
    ],
    [
      'a validation failure names each field with its first message',
      problem(400, {
        status: 400,
        code: 'validation_failed',
        errors: { title: ['Too long', 'Has a link'], price: ['Below zero'] },
      }),
      {
        status: 400,
        code: 'validation_failed',
        retryAt: null,
        reportedAt: null,
        decided: null,
        fields: { title: 'Too long', price: 'Below zero' },
      },
    ],
    [
      'a limit with retryAt in the body',
      problem(429, {
        status: 429,
        code: 'post_limit_reached',
        retryAt: '2026-06-09T15:00:00Z',
        reportedAt: null,
      }),
      {
        status: 429,
        code: 'post_limit_reached',
        retryAt: '2026-06-09T15:00:00Z',
        reportedAt: null,
        decided: null,
        fields: null,
      },
    ],
    [
      'a limit with Retry-After in seconds',
      problem(429, { status: 429, code: 'rate_limited' }, { 'retry-after': '42' }),
      {
        status: 429,
        code: 'rate_limited',
        retryAt: '2026-06-08T15:00:42.000Z',
        reportedAt: null,
        decided: null,
        fields: null,
      },
    ],
    [
      'a second report with when the first was filed',
      problem(409, { status: 409, code: 'already_reported', reportedAt: '2026-06-06T12:00:00Z' }),
      {
        status: 409,
        code: 'already_reported',
        retryAt: null,
        reportedAt: '2026-06-06T12:00:00Z',
        decided: null,
        fields: null,
      },
    ],
    [
      'a response that is not a ProblemDetails',
      new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' }),
      { status: 502, code: null, retryAt: null, reportedAt: null, decided: null, fields: null },
    ],
    [
      'a code that is not a string',
      problem(400, { status: 400, code: 7 }),
      { status: 400, code: null, retryAt: null, reportedAt: null, decided: null, fields: null },
    ],
    [
      'errors that are not lists of strings are ignored',
      problem(400, { status: 400, code: 'validation_failed', errors: { title: 'Too long' } }),
      {
        status: 400,
        code: 'validation_failed',
        retryAt: null,
        reportedAt: null,
        decided: null,
        fields: null,
      },
    ],
  ];

  it.each(cases)('maps %s', (_name, response, expected) => {
    expect(toApiError(response, NOW)).toEqual(expected);
  });
});
