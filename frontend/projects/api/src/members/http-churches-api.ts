import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ChurchOption } from './member';
import type { ChurchesApi } from './members-api';

/**
 * `ChurchesApi` over HTTP. The join dialog provides it, so its code loads with the dialog.
 * Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpChurchesApi implements ChurchesApi {
  private readonly http = inject(HttpClient);

  list(signal: AbortSignal): Promise<readonly ChurchOption[]> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const subscription = this.http.get<ChurchOption[]>('/api/churches').subscribe({
        next: resolve,
        error: reject,
      });
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
