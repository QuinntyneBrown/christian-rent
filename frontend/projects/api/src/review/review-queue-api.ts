import { InjectionToken } from '@angular/core';
import type {
  ReviewDecided,
  ReviewDecision,
  ReviewItemDetail,
  ReviewQueuePage,
} from './review-item';

/**
 * The review queue, as Admin reads it and decides on it (view-review-queue and
 * decide-review-item designs). Only an admin is answered;
 * anyone else is refused with `not_signed_in` or `not_an_admin`. Aborting `signal` cancels a
 * request, and the promise rejects with an `AbortError`; a failure rejects with an `ApiError`.
 */
export interface ReviewQueueApi {
  /** At most 50 waiting items, oldest first: the first page when `cursor` is null. */
  page(cursor: string | null, signal: AbortSignal): Promise<ReviewQueuePage>;

  /** One waiting item. One that no longer waits rejects with the code `not_found`. */
  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail>;

  /**
   * Decides an item as it was read, by its `version`. One already decided otherwise rejects with
   * the code `already_decided`, and one that no longer waits with `not_found`.
   */
  decide(
    id: string,
    decision: ReviewDecision,
    version: number,
    signal: AbortSignal,
  ): Promise<ReviewDecided>;
}

export const REVIEW_QUEUE_API = new InjectionToken<ReviewQueueApi>('REVIEW_QUEUE_API');
