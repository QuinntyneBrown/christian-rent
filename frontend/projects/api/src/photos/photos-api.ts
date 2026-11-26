import { InjectionToken } from '@angular/core';

/** The addresses of a photo's renditions (ADR 0011). */
export interface PhotoUrls {
  readonly card: string;
  readonly gallery: string;
  readonly thumb: string;
}

/** An uploaded photo, as `POST /api/photos` answers it (add-photos design). */
export interface PhotoRef {
  readonly id: string;
  readonly urls: PhotoUrls;
}

/**
 * A member's photos while they post (add-photos design; ADR 0021). The backend checks every
 * photo; the browser only sends it.
 */
export interface PhotosApi {
  /**
   * Uploads one file. A refused photo rejects with an `ApiError` whose code names the rule, such
   * as `photo_too_small`; aborting `signal` cancels the upload.
   */
  upload(file: File, signal: AbortSignal): Promise<PhotoRef>;

  /** Deletes the member's own photo that no listing names. Aborting `signal` cancels it. */
  remove(id: string, signal: AbortSignal): Promise<void>;
}

export const PHOTOS_API = new InjectionToken<PhotosApi>('PHOTOS_API');
