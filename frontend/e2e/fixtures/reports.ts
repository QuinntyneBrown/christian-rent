import type { ApiFixtures } from './api';

/** `METHOD path` of reporting a listing, as `ApiFixtures` keys it. */
export function reportPath(listingId: string): string {
  return `/api/listings/${listingId}/reports`;
}

/** Reporting as the backend answers it (report-listing design): 201 with when it was filed. */
export function answerReporting(api: ApiFixtures, listingId: string): void {
  api.answer('POST', reportPath(listingId), {
    status: 201,
    body: { reportedAt: new Date().toISOString() },
  });
}

/** A second report (L2-021, criterion 3): 409 with when the first was filed. */
export function refuseAsAlreadyReported(
  api: ApiFixtures,
  listingId: string,
  reportedAt: Date,
): void {
  api.answer('POST', reportPath(listingId), {
    status: 409,
    body: {
      type: 'about:blank',
      title: 'Already done',
      status: 409,
      code: 'already_reported',
      reportedAt: reportedAt.toISOString(),
    },
    headers: { 'content-type': 'application/problem+json' },
  });
}

/** What a spec reads of the reports sent about a listing. */
export function reportBodies(api: ApiFixtures, listingId: string): unknown[] {
  return api.bodies.get(`POST ${reportPath(listingId)}`) ?? [];
}
