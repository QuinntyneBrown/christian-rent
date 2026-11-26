import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ReportListingRequest, Reported } from './report';
import type { ReportsApi } from './reports-api';

/**
 * `ReportsApi` over HTTP. The Listing route provides it, so its code stays out of the initial
 * bundle. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpReportsApi implements ReportsApi {
  private readonly http = inject(HttpClient);

  report(listingId: string, request: ReportListingRequest, signal: AbortSignal): Promise<Reported> {
    return new Promise<Reported>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const subscription = this.http
        .post<Reported>(`/api/listings/${encodeURIComponent(listingId)}/reports`, request)
        .subscribe({ next: resolve, error: reject });
      signal.addEventListener(
        'abort',
        () => {
          subscription.unsubscribe();
          reject(signal.reason);
        },
        { once: true },
      );
    });
  }
}
