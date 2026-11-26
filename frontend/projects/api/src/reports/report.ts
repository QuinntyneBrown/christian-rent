/** Why a member reports a listing, as the report endpoint takes it (ADR 0023). */
export type ReportReason = 'fake' | 'inappropriate' | 'scam' | 'other';

/** What `POST /api/listings/{listingId}/reports` takes: a reason, and a note or null. */
export interface ReportListingRequest {
  readonly reason: ReportReason;
  readonly note: string | null;
}

/** What it answers: when the report was filed, and nothing the member wrote. */
export interface Reported {
  /** As an ISO instant. */
  readonly reportedAt: string;
}
