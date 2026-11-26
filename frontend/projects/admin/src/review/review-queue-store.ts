import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { REVIEW_QUEUE_API, type QueueItemView, type ReviewDetailView, isApiError } from '@rent/api';
import { toQueueItemView, toReviewDetailView } from '@rent/domain';

/** Where the queue is (L2-019, criteria 1 and 3). */
export type ReviewState = 'loading' | 'loaded' | 'empty' | 'failed';

/** Where the selected item's detail is: nothing selected, awaited, shown, failed or gone. */
export type DetailState = 'none' | 'loading' | 'loaded' | 'failed' | 'gone';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/**
 * The state of Admin's review queue, provided by Admin's route and gone when the admin leaves it
 * (view-review-queue design). It holds the waiting items and which one is selected, and loads
 * that item's detail; selecting another aborts the detail still on its way. Nothing is selected,
 * and no detail asked for, while the screen shows no detail panel (L2-019, criterion 13).
 * Destroying it aborts both requests and clears its timers.
 */
@Injectable()
export class ReviewQueueStore {
  private readonly api = inject(REVIEW_QUEUE_API);

  private readonly _state = signal<ReviewState>('loading');
  private readonly _skeleton = signal(false);
  private readonly _items = signal<readonly QueueItemView[]>([]);
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
  readonly items = this._items.asReadonly();
  readonly waitingCount = this._waitingCount.asReadonly();
  readonly held = computed(() => this._items().length);
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
    this._items.set([]);
    this._waitingCount.set(0);
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const page = await this.api.page(null, request.signal);
      const now = new Date();
      this._items.set(page.items.map((item) => toQueueItemView(item, now)));
      this._waitingCount.set(page.waitingCount);
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

  /** Selects an item and loads its detail. */
  select(id: string): void {
    if (!this.detailShown || id === this._selectedId()) {
      return;
    }
    this.clearSelection();
    this._selectedId.set(id);
    void this.loadDetail(id);
  }

  private selectFirst(): void {
    const first = this._items()[0];
    if (first && this._selectedId() === null) {
      this.select(first.id);
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
        this._detail.set(toReviewDetailView(detail));
        this._detailState.set('loaded');
      }
    } catch (error) {
      this.fail(error, request, () => this._detailState.set('failed'));
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
