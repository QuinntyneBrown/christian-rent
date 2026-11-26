import type { ApiFixtures } from './api';

/** The identifier `POST /api/listings` answers for the posted listing. */
export const POSTED_ID = 'b0571ed0-0006-4000-8000-000000000006';

/**
 * Posting as the backend answers it (publish-listing design): 201 with the listing waiting for
 * review the first time, 200 with the same listing for a client request already posted.
 */
export function answerPosting(api: ApiFixtures): void {
  const posted = new Set<string>();
  api.answer('POST', '/api/listings', () => {
    const body = api.bodies.get('POST /api/listings')?.at(-1) as { clientRequestId: string };
    const again = posted.has(body.clientRequestId);
    posted.add(body.clientRequestId);
    return { status: again ? 200 : 201, body: { id: POSTED_ID, status: 'waiting-for-review' } };
  });
}
