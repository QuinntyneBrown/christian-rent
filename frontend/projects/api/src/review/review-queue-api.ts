import { InjectionToken } from '@angular/core';
import type { ReviewItemDetail, ReviewQueuePage } from './review-item';

/**
 * The review queue, as Admin reads it (view-review-queue design). Only an admin is answered;
 * anyone else is refused with `not_signed_in` or `not_an_admin`. Aborting `signal` cancels a
 * request, and the promise rejects with an `AbortError`; a failure rejects with an `ApiError`.
 */
export interface ReviewQueueApi {
  /** At most 50 waiting items, oldest first: the first page when `cursor` is null. */
  page(cursor: string | null, signal: AbortSignal): Promise<ReviewQueuePage>;

  /** One waiting item. One that no longer waits rejects with the code `not_found`. */
  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail>;
}

export const REVIEW_QUEUE_API = new InjectionToken<ReviewQueueApi>('REVIEW_QUEUE_API');
