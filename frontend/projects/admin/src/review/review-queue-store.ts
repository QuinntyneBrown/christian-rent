import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  REVIEW_QUEUE_API,
  type QueueItemView,
  type ReviewDetailView,
  type ReviewQueuePage,
  isApiError,
} from '@rent/api';
import {
  ListingWindow,
  type PageRequest,
  type WindowPage,
  toQueueItemView,
  toReviewDetailView,
} from '@rent/domain';

/** Where the queue is (L2-019, criteria 1 and 3). */
export type ReviewState = 'loading' | 'loaded' | 'empty' | 'failed';

/** Where the selected item's detail is: nothing selected, awaited, shown, failed or gone. */
export type DetailState = 'none' | 'loading' | 'loaded' | 'failed' | 'gone';

/** Where the next page is (L2-019, criteria 4 and 20): none asked, in flight, failed, or none left. */
export type MoreState = 'idle' | 'loading' | 'failed' | 'done';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/** The pages kept in memory, 50 items each (L2-019, criterion 19). */
export const WINDOW_PAGES = 3;

/** The items a page holds, as the API gives them. */
export const PAGE_SIZE = 50;

/** Gives the height of a held page as the screen draws it, just before it is released. */
export type MeasurePage = (index: number) => number;

/**
 * The state of Admin's review queue, provided by Admin's route and gone when the admin leaves it
 * (view-review-queue design). The waiting items live in a `ListingWindow` of three pages, so
 * memory stays bounded however far the queue goes. It holds which item is selected, and loads
 * that item's detail; selecting another aborts the detail still on its way. Nothing is selected,
 * and no detail asked for, while the screen shows no detail panel (L2-019, criterion 13).
 * Destroying it aborts both requests and clears its timers.
 */
@Injectable()
export class ReviewQueueStore {
  private readonly api = inject(REVIEW_QUEUE_API);
  private readonly window = new ListingWindow<QueueItemView>(WINDOW_PAGES);

  private readonly _state = signal<ReviewState>('loading');
  private readonly _skeleton = signal(false);
  private readonly _pages = signal<readonly WindowPage<QueueItemView>[]>([]);
  private readonly _before = signal(0);
  private readonly _after = signal(0);
  private readonly _moreState = signal<MoreState>('idle');
  private readonly _waitingCount = signal(0);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _detailState = signal<DetailState>('none');
  private readonly _detail = signal<ReviewDetailView | null>(null);
  private readonly _detailSkeleton = signal(false);

  private request: AbortController | null = null;
  private detailRequest: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;
  private detailSkeletonTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether the screen is wide enough to show a detail panel. */
  private detailShown = false;

  readonly state = this._state.asReadonly();
  /** True once the queue has been awaited for 300 ms. */
  readonly skeleton = this._skeleton.asReadonly();
  /** The pages held, each with its place in the queue. */
  readonly pages = this._pages.asReadonly();
  readonly items = computed(() => this._pages().flatMap((page) => page.items));
  /** The heights released above and below the pages held, which spacers reserve. */
  readonly before = this._before.asReadonly();
  readonly after = this._after.asReadonly();
  /** True while a page released above the window can be asked for again. */
  readonly hasBefore = computed(() => this._before() > 0);
  readonly moreState = this._moreState.asReadonly();
  readonly waitingCount = this._waitingCount.asReadonly();
  readonly held = computed(() => this.items().length);
  /** How many items the next page down is expected to hold: "Load 13 more". */
  readonly nextCount = computed(() => {
    const last = this._pages().at(-1);
    const upTo = last ? last.index * PAGE_SIZE + last.items.length : 0;
    return Math.max(1, Math.min(PAGE_SIZE, this._waitingCount() - upTo));
  });
  readonly selectedId = this._selectedId.asReadonly();
  readonly detailState = this._detailState.asReadonly();
  readonly detail = this._detail.asReadonly();
  /** True once a detail has been awaited for 300 ms. */
  readonly detailSkeleton = this._detailSkeleton.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.request?.abort();
      this.clearSelection();
      this.stopSkeletonTimer();
    });
  }

  /** Loads the queue from its oldest item. */
  async load(): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.clearSelection();
    this._state.set('loading');
    this.window.clear();
    this.publish();
    this._waitingCount.set(0);
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const first = this.window.nextRequest('down')!;
      const page = await this.api.page(first.cursor, request.signal);
      this.receive(first, page, () => 0);
      this._state.set(page.items.length > 0 ? 'loaded' : 'empty');
      this.selectFirst();
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
   * Loads the page that follows the window below, or the released page above it. One request
   * is in flight at a time; nothing is asked after the last page. A failure below keeps the
   * items shown and offers "Try again" (L2-019, criterion 20); one above is asked again when
   * the admin next reaches it.
   */
  async loadMore(direction: 'up' | 'down', measure: MeasurePage): Promise<void> {
    if (this._state() !== 'loaded' || this.request !== null) {
      return;
    }
    const next = this.window.nextRequest(direction);
    if (next === null) {
      return;
    }
    const request = new AbortController();
    this.request = request;
    if (direction === 'down') {
      this._moreState.set('loading');
    }
    try {
      this.receive(next, await this.api.page(next.cursor, request.signal), measure);
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

  /**
   * Says whether the screen shows a detail panel. When it does, the first item is selected
   * unless one is; when it does not, nothing is selected and a detail on its way is aborted.
   */
  showDetail(shown: boolean): void {
    this.detailShown = shown;
    if (shown) {
      this.selectFirst();
    } else {
      this.clearSelection();
    }
  }

  /** Selects an item and loads its detail; choosing one that failed asks for it again. */
  select(id: string): void {
    const shown = id === this._selectedId() && this._detailState() !== 'failed';
    if (!this.detailShown || shown) {
      return;
    }
    this.clearSelection();
    this._selectedId.set(id);
    void this.loadDetail(id);
  }

  /** Takes a page into the window, with each row written as of now. */
  private receive(request: PageRequest, page: ReviewQueuePage, measure: MeasurePage): void {
    const now = new Date();
    this.window.receive(
      request,
      page.items.map((item) => toQueueItemView(item, now)),
      page.nextCursor,
      measure,
    );
    this._waitingCount.set(page.waitingCount);
    this.publish();
  }

  private publish(): void {
    this._pages.set(this.window.pages);
    this._before.set(this.window.before);
    this._after.set(this.window.after);
    this._moreState.set(this.window.atEnd ? 'done' : 'idle');
  }

  private selectFirst(): void {
    const first = this.items()[0];
    if (first && this._selectedId() === null) {
      this.select(first.id);
    }
  }

  /** "Try again" for the selected item whose detail failed to load. */
  retryDetail(): void {
    const id = this._selectedId();
    if (id !== null && this._detailState() === 'failed') {
      void this.loadDetail(id);
    }
  }

  private async loadDetail(id: string): Promise<void> {
    const request = new AbortController();
    this.detailRequest = request;
    this._detailState.set('loading');
    this.detailSkeletonTimer = setTimeout(() => this._detailSkeleton.set(true), SKELETON_DELAY_MS);
    try {
      const detail = await this.api.item(id, request.signal);
      if (this.detailRequest === request) {
        this._detail.set(toReviewDetailView(detail, new Date()));
        this._detailState.set('loaded');
      }
    } catch (error) {
      // An item decided or removed since the queue was read is gone, not broken.
      this.fail(error, request, () =>
        this._detailState.set(isApiError(error) && error.code === 'not_found' ? 'gone' : 'failed'),
      );
    } finally {
      if (this.detailRequest === request) {
        this.detailRequest = null;
        this.stopDetailSkeletonTimer();
      }
    }
  }

  private clearSelection(): void {
    this.detailRequest?.abort();
    this.detailRequest = null;
    this.stopDetailSkeletonTimer();
    this._selectedId.set(null);
    this._detail.set(null);
    this._detailState.set('none');
  }

  /** An abort is the admin moving on, and says nothing; a refusal is shown; anything else is a bug. */
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

  private stopDetailSkeletonTimer(): void {
    if (this.detailSkeletonTimer !== null) {
      clearTimeout(this.detailSkeletonTimer);
      this.detailSkeletonTimer = null;
    }
    this._detailSkeleton.set(false);
  }
}
