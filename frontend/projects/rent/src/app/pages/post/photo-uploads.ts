import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { PHOTOS_API, type PickerPhoto } from '@rent/api';
import { MAX_PHOTOS, type PhotoProblem, photoProblemOf } from '@rent/domain';
import { PostStore } from './post-store';

/** A photo on its way: the file's name, its thumbnail's object URL and how to cancel it. */
interface Upload {
  readonly key: string;
  readonly file: string;
  readonly url: string;
  readonly controller: AbortController;
}

/**
 * Post's uploads, scoped to its route (add-photos design; ADR 0021). A chosen file shows at once
 * from an object URL while it uploads; once it is in, the draft holds it, its thumbnail is the
 * API's rendition and the object URL is revoked. A photo counts towards the 6 from the moment it
 * is chosen (L2-013, criterion 3). Removing one that is in deletes it on the backend; cancelling
 * one that uploads aborts it. Leaving Post aborts every upload and deletion in flight and
 * revokes every object URL (criterion 5; AGENTS.md, Release everything you acquire).
 */
@Injectable()
export class PhotoUploads {
  private readonly api = inject(PHOTOS_API);
  private readonly store = inject(PostStore);
  private readonly deletions = new AbortController();
  private readonly inFlight = signal<readonly Upload[]>([]);

  /** The last chosen file that was not added, and why; cleared by the next choice or removal. */
  readonly problem = signal<PhotoProblem | null>(null);

  /** What the picker draws: the photos that are in, in order, then those still uploading. */
  readonly photos = computed<readonly PickerPhoto[]>(() => [
    ...this.store.draft().photos.map((photo) => ({
      key: photo.id,
      url: photo.thumbUrl,
      uploading: false,
    })),
    ...this.inFlight().map((upload) => ({ key: upload.key, url: upload.url, uploading: true })),
  ]);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.deletions.abort();
      this.cancelAll();
    });
  }

  /** Uploads one chosen file, unless 6 photos are already in or on their way. */
  add(file: File): void {
    if (this.photos().length >= MAX_PHOTOS) {
      return;
    }
    this.problem.set(null);
    const upload: Upload = {
      key: `upload-${crypto.randomUUID()}`,
      file: file.name,
      url: URL.createObjectURL(file),
      controller: new AbortController(),
    };
    this.inFlight.update((uploads) => [...uploads, upload]);
    this.api.upload(file, upload.controller.signal).then(
      (photo) => {
        this.release(upload);
        this.store.addPhoto({ id: photo.id, thumbUrl: photo.urls.thumb, cardUrl: photo.urls.card });
      },
      (failure: unknown) => {
        if (upload.controller.signal.aborted) {
          return;
        }
        this.release(upload);
        this.problem.set(photoProblemOf(upload.file, failure));
      },
    );
  }

  /** Removes the photo with this key, or cancels its upload while it is on its way. */
  remove(key: string): void {
    this.problem.set(null);
    const upload = this.inFlight().find((each) => each.key === key);
    if (upload) {
      upload.controller.abort();
      this.release(upload);
      return;
    }
    this.store.removePhoto(key);
    // Best effort: a photo that is not deleted now is deleted after 24 hours (ADR 0021).
    this.api.remove(key, this.deletions.signal).catch(() => undefined);
  }

  /** Cancels every upload on its way, as leaving Post or publishing does (ADR 0021). */
  cancelAll(): void {
    for (const upload of this.inFlight()) {
      upload.controller.abort();
      this.release(upload);
    }
  }

  private release(upload: Upload): void {
    URL.revokeObjectURL(upload.url);
    this.inFlight.update((uploads) => uploads.filter((each) => each !== upload));
  }
}
