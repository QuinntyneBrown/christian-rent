import type {
  ListingKind,
  ListingOffer,
  ListingPrice,
  ListingWhen,
} from '../listings/listing-card';
import type { ListingDetailPhoto } from '../listings/listing-detail';

/** What waits in the review queue (L2-019). */
export type ReviewItemKind = 'new-listing' | 'report' | 'new-member';

/** One row of the queue, as `GET /api/review-queue` answers it (view-review-queue design). */
export interface ReviewItemSummary {
  readonly id: string;
  readonly kind: ReviewItemKind;
  /** The listing's title, or the member's name. */
  readonly title: string;
  /** Who posted the listing, or the member's church. */
  readonly who: string;
  /** Since when it has waited, as an ISO instant. */
  readonly waitingSince: string;
  /** The listing's offer; null for a member. */
  readonly offer: ListingOffer | null;
  /** The listing's first photo for rent, when it has one. */
  readonly thumbUrl: string | null;
}

/** One page of the queue: at most 50 items, oldest first, and how many wait in all (ADR 0024). */
export interface ReviewQueuePage {
  readonly items: readonly ReviewItemSummary[];
  readonly nextCursor: string | null;
  readonly waitingCount: number;
}

/** The listing of a new listing or a report, with everything needed to decide (L2-019, criterion 7). */
export interface ReviewListing {
  readonly id: string;
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: ListingPrice | null;
  readonly when: ListingWhen;
  readonly area: string;
  readonly note: string | null;
  readonly postedAt: string;
  /** Since when it has been public; null while it waits. */
  readonly approvedAt: string | null;
  readonly photos: readonly ListingDetailPhoto[];
  readonly poster: {
    readonly name: string;
    readonly isVerified: boolean;
    /** When they joined, as an ISO instant. */
    readonly memberSince: string;
    readonly church: { readonly name: string; readonly isVerified: boolean };
  };
}

/** The reasons a member reports a listing for, as the API words them (ADR 0023). */
export type ReviewReportReason = 'fake' | 'inappropriate' | 'scam' | 'other';

/** A report; it never names the member who made it (L2-021, criterion 4). */
export interface ReviewReport {
  readonly reason: ReviewReportReason;
  readonly note: string | null;
  readonly reportedAt: string;
}

/** A new member (L2-019, criterion 9). */
export interface ReviewMember {
  readonly name: string;
  readonly joinedAt: string;
  readonly church: {
    readonly name: string;
    readonly city: string;
    readonly isVerified: boolean;
    readonly enteredByThisMember: boolean;
    readonly enteredByName: string | null;
  };
  readonly listings: { readonly forRent: number; readonly wanted: number; readonly public: number };
  readonly messagesSent: number;
}

/**
 * One item, as `GET /api/review-queue/{id}` answers it: `listing` for a new listing and a
 * report, `report` for a report, `member` for a new member.
 */
export interface ReviewItemDetail {
  readonly id: string;
  readonly kind: ReviewItemKind;
  readonly waitingSince: string;
  readonly listing: ReviewListing | null;
  readonly report: ReviewReport | null;
  readonly member: ReviewMember | null;
}
