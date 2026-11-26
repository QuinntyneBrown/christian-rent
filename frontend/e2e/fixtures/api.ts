import type { Route } from '@playwright/test';

/** A canned answer to one API request. */
export interface ApiAnswer {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Answers the app's API requests from fixtures. A spec registers what each request should get;
 * a request nobody registered is recorded, and the shared fixture fails the spec with it.
 * Nothing reaches a real backend.
 */
export class ApiFixtures {
  private readonly answers = new Map<string, ApiAnswer>();
  readonly unanswered: string[] = [];

  /** Answers `method path` (path without the query string), for example `GET /api/listings`. */
  answer(method: string, path: string, answer: ApiAnswer): void {
    this.answers.set(`${method.toUpperCase()} ${path}`, answer);
  }

  /** A ProblemDetails refusal with the `code` a screen branches on. */
  refuse(method: string, path: string, status: number, code: string): void {
    this.answer(method, path, {
      status,
      body: { type: 'about:blank', title: 'Refused', status, code },
      headers: { 'content-type': 'application/problem+json' },
    });
  }

  async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    const answer = this.answers.get(key);
    if (!answer) {
      this.unanswered.push(key);
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: answer.status ?? 200,
      headers: { 'content-type': 'application/json', ...answer.headers },
      body: answer.body === undefined ? '' : JSON.stringify(answer.body),
    });
  }
}
