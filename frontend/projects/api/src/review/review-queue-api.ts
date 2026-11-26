import { InjectionToken } from '@angular/core';
import type { ReviewItemDetail, ReviewQueuePage } from './review-item';

/** The review queue, as Admin reads it (view-review-queue design). Only an admin is answered. */
export interface ReviewQueueApi {
  /**
   * One page of the waiting items, oldest first: the first page when `cursor` is null.
   * Aborting `signal` cancels the request; a failure rejects with an `ApiError`.
   */
  page(cursor: string | null, signal: AbortSignal): Promise<ReviewQueuePage>;

  /** One item with everything needed to decide it; `not_found` when it no longer waits. */
  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail>;
}

export const REVIEW_QUEUE_API = new InjectionToken<ReviewQueueApi>('REVIEW_QUEUE_API');
