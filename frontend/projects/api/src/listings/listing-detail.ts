import type { ListingKind, ListingOffer, ListingPrice, ListingWhen } from './listing-card';

/** A photo in the gallery: its `gallery` and `thumb` renditions (ADR 0011, ADR 0016). */
export interface ListingDetailPhoto {
  readonly url: string;
  readonly thumbUrl: string;
  readonly width: number;
  readonly height: number;
  /** What the photo shows, its text alternative; null while nobody has written one. */
  readonly description: string | null;
}

/** Who posted a listing, and their church. No contact detail is ever sent (L2-008, criterion 5). */
export interface ListingPoster {
  readonly name: string;
  readonly isVerified: boolean;
  /** The year they became a member. */
  readonly memberSince: number;
  readonly church: { readonly name: string; readonly isVerified: boolean };
}

/** One listing, as `GET /api/listings/{id}` answers it (read-listing design). */
export interface ListingDetail {
  readonly id: string;
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: ListingPrice | null;
  readonly when: ListingWhen;
  readonly area: string;
  /** Null until a person's area is designed (ADR 0012). */
  readonly distanceKm: number | null;
  readonly note: string | null;
  /** When the member posted it, as an ISO instant. */
  readonly postedAt: string;
  /** Empty for a wanted listing. */
  readonly photos: readonly ListingDetailPhoto[];
  readonly poster: ListingPoster;
  /** True when the signed-in member posted it. */
  readonly isOwn: boolean;
  /** When the signed-in member reported it, as an ISO instant; null for everyone else. */
  readonly reportedAt: string | null;
}
