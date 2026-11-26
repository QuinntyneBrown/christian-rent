import type { AvatarTint } from '../listings/listing-view';

/** One line of the detail's facts: "Posted by", "The Okafor family", and what is verified. */
export interface ReviewFact {
  readonly name: string;
  /** As text, never HTML. */
  readonly value: string;
  readonly verified: 'member' | 'church' | null;
}

/** What the detail shows above the listing's title. */
export type ReviewMedia =
  | {
      readonly kind: 'photo';
      readonly url: string;
      readonly alt: string;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: 'wanted' }
  | { readonly kind: 'no-photo' };

/** A listing waiting as new, or reported (L2-019, criteria 7 and 8). */
export interface ReviewListingView {
  readonly kind: 'listing';
  /** "Reported as a scam", then "by a member, 40 min ago: “…”"; null for a new listing. */
  readonly report: { readonly reason: string; readonly rest: string } | null;
  readonly media: ReviewMedia;
  readonly title: string;
  /** "$150 / day", "Up to $60 / month"; null when a wanted listing gives no price. */
  readonly price: string | null;
  /** "For rent · space". */
  readonly tag: string;
  readonly note: string | null;
  readonly facts: readonly ReviewFact[];
  /** Where "View on site" leads, for a report; null for a listing that is not public yet. */
  readonly siteUrl: string | null;
}

/** A new member (L2-019, criterion 9). */
export interface ReviewMemberView {
  readonly kind: 'member';
  readonly name: string;
  readonly initials: string;
  readonly tint: AvatarTint;
  /** "Joined Jun 8, 2026, 11:20 a.m.". */
  readonly joined: string;
  readonly facts: readonly ReviewFact[];
}

/** The detail panel's content, formatted by `@rent/domain`'s `toReviewDetailView`. */
export type ReviewDetailView = ReviewListingView | ReviewMemberView;
