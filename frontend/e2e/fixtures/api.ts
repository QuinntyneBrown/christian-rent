import type { Route } from '@playwright/test';

/** A canned answer to one API request. */
export interface ApiAnswer {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** A file to answer with, such as a photo, instead of a JSON body. */
  path?: string;
}

/** Answers from the request's address, for example by its `cursor` parameter. */
export type ApiResponder = (url: URL) => ApiAnswer | undefined;

/**
 * Answers the app's API requests from fixtures. A spec registers what each request should get;
 * a request nobody registered is recorded, and the shared fixture fails the spec with it.
 * Nothing reaches a real backend.
 */
export class ApiFixtures {
  private readonly answers = new Map<string, ApiResponder>();
  private readonly held = new Map<string, Promise<void>>();
  readonly unanswered: string[] = [];
  /** Every API request, in order, as `METHOD path?query`. */
  readonly requests: string[] = [];
  /** The body of every request that sent one, by `METHOD path`, in order. */
  readonly bodies = new Map<string, unknown[]>();

  constructor() {
    // Every screen asks who is signed in when the app starts (ADR 0017, ADR 0029). Unless a spec
    // says otherwise, nobody is signed in to either application.
    this.refuse('GET', '/api/members/me', 401, 'not_signed_in');
    this.refuse('GET', '/api/admin/session', 401, 'not_signed_in');
  }

  /** Answers `method path` (path without the query string), for example `GET /api/listings`. */
  answer(method: string, path: string, answer: ApiAnswer | ApiResponder): void {
    this.answers.set(
      `${method.toUpperCase()} ${path}`,
      typeof answer === 'function' ? answer : () => answer,
    );
  }

  /** A ProblemDetails refusal with the `code` a screen branches on. */
  refuse(method: string, path: string, status: number, code: string): void {
    this.answer(method, path, {
      status,
      body: { type: 'about:blank', title: 'Refused', status, code },
      headers: { 'content-type': 'application/problem+json' },
    });
  }

  /**
   * Holds every request to `method path` until the returned function is called, so a spec can
   * look at a screen while it waits.
   */
  hold(method: string, path: string): () => void {
    let release!: () => void;
    this.held.set(
      `${method.toUpperCase()} ${path}`,
      new Promise<void>((resolve) => (release = resolve)),
    );
    return () => {
      this.held.delete(`${method.toUpperCase()} ${path}`);
      release();
    };
  }

  async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    this.requests.push(`${request.method()} ${url.pathname}${url.search}`);
    const body = request.postData();
    if (body !== null) {
      // A JSON body is kept as data; any other, such as a photo's form, as its content type.
      const json = (request.headers()['content-type'] ?? '').includes('application/json');
      const kept = json ? (JSON.parse(body) as unknown) : request.headers()['content-type'];
      this.bodies.set(key, [...(this.bodies.get(key) ?? []), kept]);
    }
    await this.held.get(key);
    const answer = this.answers.get(key)?.(url);
    if (!answer) {
      this.unanswered.push(key);
      await route.abort('failed').catch(() => undefined);
      return;
    }
    if (answer.path) {
      await route
        .fulfill({ status: answer.status ?? 200, path: answer.path, headers: answer.headers })
        .catch(() => undefined);
      return;
    }
    // A request the page has abandoned (it navigated away) can no longer be answered.
    await route
      .fulfill({
        status: answer.status ?? 200,
        headers: { 'content-type': 'application/json', ...answer.headers },
        body: answer.body === undefined ? '' : JSON.stringify(answer.body),
      })
      .catch(() => undefined);
  }
}
