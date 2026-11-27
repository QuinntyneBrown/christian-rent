import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  ReviewArrivals,
  ReviewDecided,
  ReviewDecision,
  ReviewItemDetail,
  ReviewQueuePage,
} from './review-item';
import type { ReviewQueueApi } from './review-queue-api';

/**
 * `ReviewQueueApi` over HTTP. Admin's route provides it, so its code is downloaded only by an
 * admin. Unsubscribing aborts the request, so an aborted signal stops it in flight.
 */
@Injectable()
export class HttpReviewQueueApi implements ReviewQueueApi {
  private readonly http = inject(HttpClient);

  page(cursor: string | null, signal: AbortSignal): Promise<ReviewQueuePage> {
    const params = cursor === null ? new HttpParams() : new HttpParams().set('cursor', cursor);
    return this.send(this.http.get<ReviewQueuePage>('/api/admin/review-queue', { params }), signal);
  }

  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail> {
    return this.send(
      this.http.get<ReviewItemDetail>(`/api/admin/review-queue/${encodeURIComponent(id)}`),
      signal,
    );
  }

  arrivals(since: string, signal: AbortSignal): Promise<ReviewArrivals> {
    // Encoded whole: HttpParams would leave an offset's "+", which a server reads as a space.
    const url = `/api/admin/review-queue/arrivals?since=${encodeURIComponent(since)}`;
    return this.send(this.http.get<ReviewArrivals>(url), signal);
  }

  decide(
    id: string,
    decision: ReviewDecision,
    version: number,
    signal: AbortSignal,
  ): Promise<ReviewDecided> {
    const url = `/api/admin/review-queue/${encodeURIComponent(id)}/decision`;
    return this.send(this.http.post<ReviewDecided>(url, { decision, version }), signal);
  }

  private send<T>(response: Observable<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const subscription = response.subscribe({ next: resolve, error: reject });
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
