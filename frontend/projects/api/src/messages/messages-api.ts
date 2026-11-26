import { InjectionToken } from '@angular/core';
import type { SendMessageRequest, SentMessage } from './message';

/** Messages about a listing, as the message box sends them (send-message design). */
export interface MessagesApi {
  /**
   * Sends a message about a listing to the member who posted it. A refusal rejects with an
   * `ApiError`, such as `message_limit_reached` with its `retryAt`, `own_listing`, or
   * `not_found` for a listing that is no longer public; aborting `signal` cancels it.
   */
  send(listingId: string, request: SendMessageRequest, signal: AbortSignal): Promise<SentMessage>;
}

export const MESSAGES_API = new InjectionToken<MessagesApi>('MESSAGES_API');
