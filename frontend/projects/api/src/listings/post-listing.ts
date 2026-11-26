import type { ListingKind, ListingOffer, PricePeriod } from './listing-card';

/**
 * What `POST /api/listings` takes (publish-listing design, `PostListingCommand`): the draft,
 * cleaned, with its client request identifier. "When" is the words or the two dates; a price
 * comes with its period, and a wanted listing may have neither.
 */
export interface PostListingRequest {
  readonly clientRequestId: string;
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly priceAmount: number | null;
  readonly pricePeriod: PricePeriod | null;
  readonly whenText: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly area: string;
  readonly note: string | null;
  readonly photoIds: readonly string[];
}

/** A posted listing as the API answers it: it waits for review. */
export interface PostedListing {
  readonly id: string;
  readonly status: string;
}
