import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PhotoRef, PhotosApi } from './photos-api';

/**
 * `PhotosApi` over HTTP. Post's route provides it, so its code stays out of the initial bundle.
 * A file is sent as one multipart field, `file`; unsubscribing aborts the request, so an
 * aborted signal stops an upload in flight.
 */
@Injectable()
export class HttpPhotosApi implements PhotosApi {
  private readonly http = inject(HttpClient);

  upload(file: File, signal: AbortSignal): Promise<PhotoRef> {
    const form = new FormData();
    form.append('file', file, file.name);
    return send(this.http.post<PhotoRef>('/api/photos', form), signal);
  }

  remove(id: string, signal: AbortSignal): Promise<void> {
    return send(this.http.delete<void>(`/api/photos/${encodeURIComponent(id)}`), signal);
  }
}

function send<T>(response: Observable<T>, signal: AbortSignal): Promise<T> {
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
