import { Injectable, computed, inject, signal } from '@angular/core';
import { LISTINGS_API, type ListingCardView } from '@rent/api';
import { toListingCardView } from '@rent/domain';

/** Where the first page is. */
export type BrowseState = 'loading' | 'loaded' | 'empty' | 'failed';

/**
 * Browse's state, provided by the page and gone when the person leaves it (browse-listings
 * design).
 */
@Injectable()
export class BrowseStore {
  private readonly api = inject(LISTINGS_API);

  private readonly _state = signal<BrowseState>('loading');
  private readonly _cards = signal<readonly ListingCardView[]>([]);
  private readonly _total = signal(0);

  readonly state = this._state.asReadonly();
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

  async loadFirst(): Promise<void> {
    this._state.set('loading');
    const page = await this.api.browse(null, new AbortController().signal);
    this._cards.set(page.items.map(toListingCardView));
    this._total.set(page.counts.everything);
    this._state.set(page.items.length === 0 ? 'empty' : 'loaded');
  }
}
