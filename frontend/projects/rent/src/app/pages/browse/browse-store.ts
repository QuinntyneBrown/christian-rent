import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { LISTINGS_API, type ListingCardView, isApiError } from '@rent/api';
import { ListingWindow, type PageRequest, type WindowPage, toListingCardView } from '@rent/domain';

/** Where the first page is (L2-033). */
export type BrowseState = 'loading' | 'loaded' | 'empty' | 'failed';

/** Where the next page is (L2-006): none asked, in flight, failed, or none left. */
export type MoreState = 'idle' | 'loading' | 'failed' | 'done';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/** The pages Browse keeps in memory, 24 listings each (ADR 0013). */
export const WINDOW_PAGES = 3;

/** Gives the height of a held page as the screen draws it, just before it is released. */
export type MeasurePage = (index: number) => number;

/**
 * Browse's state, provided by the page and gone when the person leaves it (browse-listings
 * design). The cards live in a `ListingWindow`, so memory stays bounded however far the list
 * goes (L2-030, criterion 4). Leaving aborts the request in flight and clears the skeleton's
 * timer.
 */
@Injectable()
export class BrowseStore {
  private readonly api = inject(LISTINGS_API);
  private readonly window = new ListingWindow<ListingCardView>(WINDOW_PAGES);

  private readonly _state = signal<BrowseState>('loading');
  private readonly _moreState = signal<MoreState>('idle');
  private readonly _skeleton = signal(false);
  private readonly _pages = signal<readonly WindowPage<ListingCardView>[]>([]);
  private readonly _before = signal(0);
  private readonly _after = signal(0);
  private readonly _total = signal(0);
  private request: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  readonly moreState = this._moreState.asReadonly();
  /** True once the first page has been awaited for 300 ms (L2-033, criteria 1 and 5). */
  readonly skeleton = this._skeleton.asReadonly();
  /** The pages held, each with its place in the list. */
  readonly pages = this._pages.asReadonly();
  readonly cards = computed(() => this._pages().flatMap((page) => page.items));
  /** The heights released above and below the pages held, which spacers reserve. */
  readonly before = this._before.asReadonly();
  readonly after = this._after.asReadonly();
  /** True while a page released above the window can be asked for again. */
  readonly hasBefore = computed(() => this._before() > 0);

  /** What the status line announces (L2-001, criterion 10; L2-006, criterion 4). */
  readonly announcement = computed(() => {
    switch (this._state()) {
      case 'loading':
        return 'Loading listings';
      case 'empty':
        return 'No listings yet';
      case 'failed':
        return 'We couldn’t load the listings.';
      case 'loaded':
        if (this._moreState() === 'loading') {
          return 'Loading more listings';
        }
        if (this._moreState() === 'failed') {
          // The failure is announced by its alert.
          return '';
        }
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
    this.window.clear();
    this.publish();
    this._state.set('loading');
    this._moreState.set('idle');
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const first = this.window.nextRequest('down')!;
      const page = await this.api.browse(first.cursor, request.signal);
      this.window.receive(first, page.items.map(toListingCardView), page.nextCursor, () => 0);
      this._total.set(page.counts.everything);
      this._state.set(page.items.length === 0 ? 'empty' : 'loaded');
      this.publish();
    } catch (error) {
      this.fail(error, request, () => this._state.set('failed'));
    } finally {
      if (this.request === request) {
        this.request = null;
        this.stopSkeletonTimer();
        this._skeleton.set(false);
      }
    }
  }

  /**
   * Loads the page that follows the window below, or the released page above it. One request is
   * in flight at a time; nothing is asked after the last page (L2-006, criterion 2). A failure
   * below leaves the listings shown and offers "Try again" (criterion 3); one above is asked
   * again when the person next reaches it.
   */
  async loadMore(direction: 'up' | 'down', measure: MeasurePage): Promise<void> {
    if (this._state() !== 'loaded' || this.request !== null) {
      return;
    }
    const next: PageRequest | null = this.window.nextRequest(direction);
    if (next === null) {
      return;
    }
    const request = new AbortController();
    this.request = request;
    if (direction === 'down') {
      this._moreState.set('loading');
    }
    try {
      const page = await this.api.browse(next.cursor, request.signal);
      this.window.receive(next, page.items.map(toListingCardView), page.nextCursor, measure);
      this._total.set(page.counts.everything);
      this.publish();
    } catch (error) {
      this.fail(error, request, () => {
        if (direction === 'down') {
          this._moreState.set('failed');
        }
      });
    } finally {
      if (this.request === request) {
        this.request = null;
      }
    }
  }

  private publish(): void {
    this._pages.set(this.window.pages);
    this._before.set(this.window.before);
    this._after.set(this.window.after);
    this._moreState.set(this.window.atEnd ? 'done' : 'idle');
  }

  /** An abort is the person leaving, and says nothing; a refusal is shown; anything else is a bug. */
  private fail(error: unknown, request: AbortController, show: () => void): void {
    if (request.signal.aborted) {
      return;
    }
    if (!isApiError(error)) {
      throw error;
    }
    show();
  }

  private stopSkeletonTimer(): void {
    if (this.skeletonTimer !== null) {
      clearTimeout(this.skeletonTimer);
      this.skeletonTimer = null;
    }
  }
}
