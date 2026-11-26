import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ListingsPage } from './listing-card';
import type { ListingsApi } from './listings-api';

/**
 * `ListingsApi` over HTTP. The route that uses it provides it, so its code stays out of the
 * initial bundle. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpListingsApi implements ListingsApi {
  private readonly http = inject(HttpClient);

  browse(cursor: string | null, signal: AbortSignal): Promise<ListingsPage> {
    const params = cursor === null ? new HttpParams() : new HttpParams().set('cursor', cursor);
    return new Promise<ListingsPage>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const subscription = this.http
        .get<ListingsPage>('/api/listings', { params })
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
