import { InjectionToken } from '@angular/core';
import type { ReportListingRequest, Reported } from './report';

/** Reports of listings, as the report dialog files them (report-listing design). */
export interface ReportsApi {
  /**
   * Reports a listing to the admins. A refusal rejects with an `ApiError`, such as
   * `already_reported` with its `reportedAt`, `own_listing`, or `not_found` for a listing that
   * is no longer public; aborting `signal` cancels it.
   */
  report(listingId: string, request: ReportListingRequest, signal: AbortSignal): Promise<Reported>;
}

export const REPORTS_API = new InjectionToken<ReportsApi>('REPORTS_API');
