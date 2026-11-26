import type {
  ListingKind,
  ListingOffer,
  ListingPrice,
  ListingWhen,
} from '../listings/listing-card';
import type { ReportReason } from '../reports/report';

/** What a review item is about. */
export type ReviewKind = 'new-listing' | 'report' | 'new-member';

/** What an admin does with an item (L2-020). */
export type ReviewDecision = 'approve' | 'keep' | 'remove';

/** The decision that stands, as a refused second one is told it (ADR 0026). */
export interface EarlierDecision {
  readonly decision: ReviewDecision;
  /** As an ISO instant. */
  readonly at: string;
  /** Whether the admin asking made it. */
  readonly byYou: boolean;
}

/** What a decision closed: the item decided, and any other it closed with it. */
export interface ReviewDecided {
  readonly closedItemIds: readonly string[];
}

/** One row of the review queue, as `GET /api/review-queue` answers it (view-review-queue design). */
export interface ReviewItemSummary {
  readonly id: string;
  readonly kind: ReviewKind;
  /** The listing's title, or the member's name. */
  readonly title: string;
  /** Who posted the listing, or a new member's church. */
  readonly who: string;
  /** Since when it has waited, as an ISO instant. */
  readonly waitingSince: string;
  /** The listing's; null for a new member. */
  readonly offer: ListingOffer | null;
  /** The first photo of a listing for rent that has one. */
  readonly thumbUrl: string | null;
}

/** At most one page of the queue, oldest first. */
export interface ReviewQueuePage {
  readonly items: readonly ReviewItemSummary[];
  /** Asks for the page after this one; null when it is the last. */
  readonly nextCursor: string | null;
  /** How many items wait in all. */
  readonly waitingCount: number;
  /** When the page was read, as an ISO instant: arrivals are counted from the first page's. */
  readonly asOf: string;
}

/** A listing as an admin decides on it: every field, and every photo in the member's order. */
export interface ReviewListing {
  readonly id: string;
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: ListingPrice | null;
  readonly when: ListingWhen;
  readonly area: string;
  readonly note: string | null;
  readonly photos: readonly {
    readonly url: string;
    readonly thumbUrl: string;
    readonly description: string | null;
  }[];
  readonly poster: {
    readonly name: string;
    readonly isVerified: boolean;
    /** As an ISO instant. */
    readonly joinedAt: string;
    readonly church: { readonly name: string; readonly isVerified: boolean };
  };
  /** As an ISO instant. */
  readonly postedAt: string;
}

/** A report, which never says who reported (L2-019, criterion 8). */
export interface ReviewReport {
  readonly reason: ReportReason;
  readonly note: string | null;
  readonly reportedAt: string;
  readonly publicSince: string;
  readonly listing: ReviewListing;
}

/** A new member, and what they have done so far. The counts leave out removed listings. */
export interface ReviewMember {
  readonly name: string;
  readonly joinedAt: string;
  readonly church: {
    readonly name: string;
    readonly city: string;
    readonly isVerified: boolean;
    /** Who entered the church, when that is recorded. */
    readonly enteredBy: { readonly name: string; readonly isThisMember: boolean } | null;
  };
  readonly listingCount: number;
  readonly forRentCount: number;
  readonly publicCount: number;
  readonly messageCount: number;
}

/** One waiting item in full; `kind` says which one of the three parts is set. */
export interface ReviewItemDetail {
  readonly id: string;
  readonly kind: ReviewKind;
  readonly waitingSince: string;
  /** Sent back with a decision (ADR 0026). */
  readonly version: number;
  /** What its kind takes (L2-020, criterion 8). */
  readonly allowedDecisions: readonly ReviewDecision[];
  readonly listing: ReviewListing | null;
  readonly report: ReviewReport | null;
  readonly member: ReviewMember | null;
}
