import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { SendMessageRequest, SentMessage } from './message';
import type { MessagesApi } from './messages-api';

/**
 * `MessagesApi` over HTTP. The Listing route provides it, so its code stays out of the initial
 * bundle. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpMessagesApi implements MessagesApi {
  private readonly http = inject(HttpClient);

  send(listingId: string, request: SendMessageRequest, signal: AbortSignal): Promise<SentMessage> {
    return new Promise<SentMessage>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const subscription = this.http
        .post<SentMessage>(`/api/listings/${encodeURIComponent(listingId)}/messages`, request)
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
