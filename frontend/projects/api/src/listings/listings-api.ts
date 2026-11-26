import { InjectionToken } from '@angular/core';
import type { ListingKind, ListingOffer, ListingsPage } from './listing-card';
import type { ListingDetail } from './listing-detail';

/**
 * What Browse narrows the listings to (search-and-filter design): an offer or both, a kind or
 * both, and the words of a search term, empty for none.
 */
export interface ListingsFilter {
  readonly offer: ListingOffer | null;
  readonly kind: ListingKind | null;
  readonly term: string;
}

/** Every approved listing. */
export const NO_FILTER: ListingsFilter = { offer: null, kind: null, term: '' };

/**
 * The listings, as Browse and Listing read them (browse-listings, search-and-filter and
 * read-listing designs).
 */
export interface ListingsApi {
  /**
   * One page of the approved listings that match `filter`, newest first: the first page when
   * `cursor` is null. The page's counts are for the filter's kind and term, by offer.
   * Aborting `signal` cancels the request, and the promise rejects with an `AbortError`.
   * A failure rejects with an `ApiError`.
   */
  browse(filter: ListingsFilter, cursor: string | null, signal: AbortSignal): Promise<ListingsPage>;

  /**
   * One listing. A listing the caller may not see, or that does not exist, rejects with an
   * `ApiError` whose code is `not_found` (L2-007, criterion 4). Aborting `signal` cancels it.
   */
  get(id: string, signal: AbortSignal): Promise<ListingDetail>;
}

export const LISTINGS_API = new InjectionToken<ListingsApi>('LISTINGS_API');
