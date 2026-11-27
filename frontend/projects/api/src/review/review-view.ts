import type { AvatarTint } from '../listings/listing-view';
import type { ReviewDecision, ReviewKind } from './review-item';

/** What stands at the start of a queue row. */
export type QueueThumbView =
  | { readonly type: 'photo'; readonly url: string }
  | { readonly type: 'wanted' }
  | { readonly type: 'no-photo' }
  | { readonly type: 'member'; readonly initials: string };

/** A review item as `cr-queue-item` draws it, every word already written. */
export interface QueueItemView {
  readonly id: string;
  readonly title: string;
  /** "The Okafor family · 3 hr". */
  readonly meta: string;
  readonly kind: ReviewKind;
  /** "New", "Reported", "New member": the kind in words (L2-019, criterion 6). */
  readonly kindLabel: string;
  readonly thumb: QueueThumbView;
}

/** One fact of a detail: "Church", its value, and what of it is verified. */
export interface ReviewFactView {
  readonly term: string;
  readonly value: string;
  readonly verified: 'member' | 'church' | null;
  /** Set on a new member's "Church status": whether the church can be confirmed. */
  readonly churchStatus?: { readonly confirmable: boolean };
}

/** One button of the decision bar. */
export interface ReviewDecisionView {
  readonly decision: ReviewDecision;
  /** "Approve", "Keep listing", "Remove". */
  readonly label: string;
}

/** A new listing, or a reported one, as `cr-review-detail` draws it. */
export interface ReviewListingView {
  readonly type: 'listing';
  /** What a report says, over the listing; null for a new listing. */
  readonly report: { readonly headline: string; readonly rest: string } | null;
  readonly wanted: boolean;
  /** A listing for rent's photos, the first drawn large. */
  readonly photos: readonly { readonly url: string; readonly alt: string }[];
  readonly title: string;
  /** "$150 / day"; null when a wanted listing names no price. */
  readonly price: string | null;
  /** "For rent · space". */
  readonly tag: string;
  readonly note: string | null;
  readonly facts: readonly ReviewFactView[];
  /** The listing's screen, for one that is public; null for a new listing. */
  readonly siteHref: string | null;
  readonly decisions: readonly ReviewDecisionView[];
}

/** A new member as `cr-review-detail` draws them. */
export interface ReviewMemberView {
  readonly type: 'member';
  readonly initials: string;
  readonly tint: AvatarTint;
  readonly name: string;
  /** "Joined Jun 8, 2026, 11:20 a.m." */
  readonly joined: string;
  readonly facts: readonly ReviewFactView[];
  readonly decisions: readonly ReviewDecisionView[];
}

/** The selected item in full, as the detail panel draws it. */
export type ReviewDetailView = ReviewListingView | ReviewMemberView;
