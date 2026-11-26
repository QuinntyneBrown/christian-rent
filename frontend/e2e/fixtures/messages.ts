import type { ApiFixtures } from './api';

/** The identifier `POST /api/listings/{id}/messages` answers for the sent message. */
export const SENT_ID = '3e55a9e0-0008-4000-8000-000000000008';

/** `METHOD path` of sending a message about a listing, as `ApiFixtures` keys it. */
export function sendPath(listingId: string): string {
  return `/api/listings/${listingId}/messages`;
}

/** Sending as the backend answers it (send-message design): 201 with the message, never its text. */
export function answerSending(api: ApiFixtures, listingId: string): void {
  api.answer('POST', sendPath(listingId), {
    status: 201,
    body: { id: SENT_ID, sentAt: new Date().toISOString() },
  });
}

/** The messaging limit's refusal (L2-016, criterion 4): 429 with when sending reopens. */
export function refuseSendingAtLimit(api: ApiFixtures, listingId: string, retryAt: Date): void {
  api.answer('POST', sendPath(listingId), {
    status: 429,
    body: {
      type: 'about:blank',
      title: 'Limit reached',
      status: 429,
      code: 'message_limit_reached',
      retryAt: retryAt.toISOString(),
    },
    headers: { 'content-type': 'application/problem+json' },
  });
}

/** What a spec reads of the messages sent about a listing. */
export function sentBodies(api: ApiFixtures, listingId: string): unknown[] {
  return api.bodies.get(`POST ${sendPath(listingId)}`) ?? [];
}
