import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ChurchVerificationApi } from './church-verification-api';

/**
 * `ChurchVerificationApi` over HTTP. Admin's review page provides it, so its code is downloaded
 * only by an admin, with that page. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpChurchVerificationApi implements ChurchVerificationApi {
  private readonly http = inject(HttpClient);

  verify(churchId: string, signal: AbortSignal): Promise<void> {
    const url = `/api/admin/churches/${encodeURIComponent(churchId)}/verification`;
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      // The request has no body, and its answer has none.
      const subscription = this.http
        .post<void>(url, null)
        .subscribe({ next: () => resolve(), error: reject });
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
