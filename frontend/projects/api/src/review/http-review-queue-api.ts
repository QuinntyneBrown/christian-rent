import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, firstValueFrom } from 'rxjs';
import type { ReviewDecision, ReviewItemDetail, ReviewQueuePage } from './review-item';
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
    return this.send(this.http.get<ReviewQueuePage>('/api/review-queue', { params }), signal);
  }

  item(id: string, signal: AbortSignal): Promise<ReviewItemDetail> {
    return this.send(
      this.http.get<ReviewItemDetail>(`/api/review-queue/${encodeURIComponent(id)}`),
      signal,
    );
  }

  async decide(id: string, decision: ReviewDecision): Promise<void> {
    await firstValueFrom(
      this.http.post(`/api/review-queue/${encodeURIComponent(id)}/decision`, { decision }),
    );
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
