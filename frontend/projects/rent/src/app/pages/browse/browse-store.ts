import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { LISTINGS_API, type ListingCardView, isApiError } from '@rent/api';
import { toListingCardView } from '@rent/domain';

/** Where the first page is (L2-033). */
export type BrowseState = 'loading' | 'loaded' | 'empty' | 'failed';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/**
 * Browse's state, provided by the page and gone when the person leaves it (browse-listings
 * design). Leaving aborts the request in flight and clears the skeleton's timer.
 */
@Injectable()
export class BrowseStore {
  private readonly api = inject(LISTINGS_API);

  private readonly _state = signal<BrowseState>('loading');
  private readonly _skeleton = signal(false);
  private readonly _cards = signal<readonly ListingCardView[]>([]);
  private readonly _total = signal(0);
  private request: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  /** True once the first page has been awaited for 300 ms (L2-033, criteria 1 and 5). */
  readonly skeleton = this._skeleton.asReadonly();
  readonly cards = this._cards.asReadonly();

  /** What the status line announces (L2-001, criterion 10). */
  readonly announcement = computed(() => {
    switch (this._state()) {
      case 'loading':
        return 'Loading listings';
      case 'empty':
        return 'No listings yet';
      case 'failed':
        return 'We couldn’t load the listings.';
      case 'loaded':
        return this._total() === 1 ? '1 listing' : `${this._total()} listings`;
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.request?.abort();
      this.stopSkeletonTimer();
    });
  }

  /** Loads the first page; "Try again" calls it too. */
  async loadFirst(): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this._state.set('loading');
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const page = await this.api.browse(null, request.signal);
      this._cards.set(page.items.map(toListingCardView));
      this._total.set(page.counts.everything);
      this._state.set(page.items.length === 0 ? 'empty' : 'loaded');
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      if (!isApiError(error)) {
        throw error;
      }
      this._state.set('failed');
    } finally {
      if (this.request === request) {
        this.request = null;
        this.stopSkeletonTimer();
        this._skeleton.set(false);
      }
    }
  }

  private stopSkeletonTimer(): void {
    if (this.skeletonTimer !== null) {
      clearTimeout(this.skeletonTimer);
      this.skeletonTimer = null;
    }
  }
}
