import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { type QueueItemView, REVIEW_QUEUE_API, isApiError } from '@rent/api';
import {
  ListingWindow,
  type PageRequest,
  type QueueSummaryState,
  type WindowPage,
  queueSummary,
  toQueueItemView,
} from '@rent/domain';

/** A wait shorter than this shows no loading state (L2-033, criterion 5). */
export const SKELETON_DELAY_MS = 300;

/** The pages the queue keeps in memory, 50 items each (ADR 0024). */
export const WINDOW_PAGES = 3;

/** Where the next page is: none asked, in flight, failed, or none left. */
export type QueueMoreState = 'idle' | 'loading' | 'failed' | 'done';

/** Gives the height of a held page as the screen draws it, just before it is released. */
export type MeasurePage = (index: number) => number;

/**
 * Admin's queue, provided by its route and gone when the admin leaves (view-review-queue
 * design). The items live in a `ListingWindow` of 3 pages, so memory stays bounded however long
 * the queue is (L2-030, criterion 4; ADR 0024). One page request is in flight at a time; leaving
 * aborts it and clears the timer.
 */
@Injectable()
export class ReviewQueueStore {
  private readonly api = inject(REVIEW_QUEUE_API);
  private readonly window = new ListingWindow<QueueItemView>(WINDOW_PAGES);

  private readonly _state = signal<QueueSummaryState>('loading');
  private readonly _more = signal<QueueMoreState>('idle');
  private readonly _skeleton = signal(false);
  private readonly _pages = signal<readonly WindowPage<QueueItemView>[]>([]);
  private readonly _before = signal(0);
  private readonly _after = signal(0);
  private readonly _waiting = signal<number | null>(null);
  private request: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  readonly more = this._more.asReadonly();
  /** True once the first page has been awaited for 300 ms (L2-033, criteria 1 and 5). */
  readonly skeleton = this._skeleton.asReadonly();
  readonly pages = this._pages.asReadonly();
  readonly items = computed(() => this._pages().flatMap((page) => page.items));
  readonly before = this._before.asReadonly();
  readonly after = this._after.asReadonly();
  /** How many items wait in all; null until the first page has answered. */
  readonly waiting = this._waiting.asReadonly();
  readonly hasBefore = computed(() => this._before() > 0);

  /** The summary under "Review"; empty during a wait too short for a loading state. */
  readonly summary = computed(() => {
    const state = this._state();
    if (state === 'loading' && !this._skeleton()) {
      return '';
    }
    return queueSummary(state, this._waiting() ?? 0, this.items().length);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.request?.abort();
      this.stopSkeletonTimer();
    });
  }

  /** Loads the first page; "Try again" calls it too. */
  async load(): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.window.clear();
    this.publish();
    this._state.set('loading');
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const first = this.window.nextRequest('down')!;
      const page = await this.api.page(first.cursor, request.signal);
      this.receive(
        first,
        page.items.map((item) => toQueueItemView(item, new Date())),
        page.nextCursor,
        () => 0,
      );
      this._waiting.set(page.waitingCount);
      this._state.set(page.items.length > 0 ? 'loaded' : 'empty');
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
   * Loads the page below the window, or the released page above it. A failure below offers
   * "Try again" and keeps the items shown; one above is asked again when it is next reached.
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
      this._more.set('loading');
    }
    try {
      const page = await this.api.page(next.cursor, request.signal);
      this.receive(
        next,
        page.items.map((item) => toQueueItemView(item, new Date())),
        page.nextCursor,
        measure,
      );
      this._waiting.set(page.waitingCount);
    } catch (error) {
      this.fail(error, request, () => {
        if (direction === 'down') {
          this._more.set('failed');
        }
      });
    } finally {
      if (this.request === request) {
        this.request = null;
      }
    }
  }

  /**
   * The item to open once `id` has left the queue: the one after it, or the one before it when
   * it was the last held; null when nothing else is held.
   */
  nextAfter(id: string): string | null {
    const ids = this.items().map((item) => item.id);
    const at = ids.indexOf(id);
    if (at < 0) {
      return ids[0] ?? null;
    }
    return ids[at + 1] ?? ids[at - 1] ?? null;
  }

  /**
   * A decided item leaves the queue and the number waiting drops (L2-020, criterion 11). When
   * the last item held goes and more wait, the queue is read again.
   */
  drop(id: string): void {
    if (!this.items().some((item) => item.id === id)) {
      return;
    }
    this.window.drop((item) => item.id === id);
    this.publish();
    const waiting = Math.max(0, (this._waiting() ?? 1) - 1);
    this._waiting.set(waiting);
    if (this.items().length === 0) {
      if (waiting === 0) {
        this._state.set('empty');
      } else {
        void this.load();
      }
    }
  }

  private receive(
    request: PageRequest,
    items: QueueItemView[],
    nextCursor: string | null,
    measure: MeasurePage,
  ): void {
    this.window.receive(request, items, nextCursor, measure);
    this.publish();
  }

  private publish(): void {
    this._pages.set(this.window.pages);
    this._before.set(this.window.before);
    this._after.set(this.window.after);
    this._more.set(this.window.atEnd ? 'done' : 'idle');
  }

  /** An abort is the admin leaving, and says nothing; a refusal is shown; anything else is a bug. */
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
