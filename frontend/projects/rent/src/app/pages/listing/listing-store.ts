import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { LISTINGS_API, type ListingView, isApiError } from '@rent/api';
import { toListingView } from '@rent/domain';

/** Where the listing is (L2-033; L2-007, criterion 4). */
export type ListingState = 'loading' | 'loaded' | 'not-found' | 'failed';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/**
 * The Listing screen's state, provided by the page and gone when the person leaves it
 * (read-listing design). Leaving, or opening another listing, aborts the request in flight and
 * clears the skeleton's timer.
 */
@Injectable()
export class ListingStore {
  private readonly api = inject(LISTINGS_API);

  private readonly _state = signal<ListingState>('loading');
  private readonly _view = signal<ListingView | null>(null);
  private readonly _skeleton = signal(false);
  private id: string | null = null;
  private request: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  /** The listing as the screen draws it, once it has loaded. */
  readonly view = this._view.asReadonly();
  /** True once the listing has been awaited for 300 ms (L2-033, criteria 1 and 5). */
  readonly skeleton = this._skeleton.asReadonly();

  /** What the status line announces. */
  readonly announcement = computed(() => {
    switch (this._state()) {
      case 'loading':
        return 'Loading listing';
      case 'loaded':
        return '';
      case 'not-found':
        return 'This listing isn’t here.';
      case 'failed':
        return 'We couldn’t load this listing.';
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  /** Loads the listing; "Try again" calls it with no identifier to load the same one. */
  async load(id: string | null = this.id): Promise<void> {
    if (id === null) {
      return;
    }
    this.cancel();
    this.id = id;
    const request = new AbortController();
    this.request = request;
    this._state.set('loading');
    this._view.set(null);
    this._skeleton.set(false);
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const detail = await this.api.get(id, request.signal);
      this._view.set(toListingView(detail, new Date()));
      this._state.set('loaded');
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      if (!isApiError(error)) {
        throw error;
      }
      this._state.set(error.code === 'not_found' ? 'not-found' : 'failed');
    } finally {
      if (this.request === request) {
        this.request = null;
        this.stopSkeletonTimer();
        this._skeleton.set(false);
      }
    }
  }

  private cancel(): void {
    this.request?.abort();
    this.request = null;
    this.stopSkeletonTimer();
  }

  private stopSkeletonTimer(): void {
    if (this.skeletonTimer !== null) {
      clearTimeout(this.skeletonTimer);
      this.skeletonTimer = null;
    }
  }
}
