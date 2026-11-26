import { InjectionToken } from '@angular/core';
import type { ListingsPage } from './listing-card';

/** The listings, as Browse reads them (browse-listings design). */
export interface ListingsApi {
  /**
   * One page of approved listings, newest first: the first page when `cursor` is null.
   * Aborting `signal` cancels the request, and the promise rejects with an `AbortError`.
   * A failure rejects with an `ApiError`.
   */
  browse(cursor: string | null, signal: AbortSignal): Promise<ListingsPage>;
}

export const LISTINGS_API = new InjectionToken<ListingsApi>('LISTINGS_API');
