import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ListingsPage } from './listing-card';
import type { ListingsApi, ListingsFilter } from './listings-api';

/**
 * `ListingsApi` over HTTP. The route that uses it provides it, so its code stays out of the
 * initial bundle. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 * The filter is sent as `show`, `kind` and `q`, each omitted when it is empty (ADR 0015).
 */
@Injectable()
export class HttpListingsApi implements ListingsApi {
  private readonly http = inject(HttpClient);

  browse(
    filter: ListingsFilter,
    cursor: string | null,
    signal: AbortSignal,
  ): Promise<ListingsPage> {
    let params = new HttpParams();
    if (filter.offer !== null) {
      params = params.set('show', filter.offer);
    }
    if (filter.kind !== null) {
      params = params.set('kind', filter.kind);
    }
    if (filter.term !== '') {
      params = params.set('q', filter.term);
    }
    if (cursor !== null) {
      params = params.set('cursor', cursor);
    }
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
