import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { REVIEW_QUEUE_API, type ReviewDetailView, isApiError } from '@rent/api';
import { toReviewDetailView } from '@rent/domain';
import { SKELETON_DELAY_MS } from './review-queue-store';

/** Where the detail panel is (L2-033): nothing open, waiting, shown, failed, or no longer waiting. */
export type ReviewDetailState = 'idle' | 'loading' | 'loaded' | 'failed' | 'gone';

/**
 * The detail of the selected item (view-review-queue design; ADR 0024). One request is in
 * flight at a time: opening another item aborts the one before, so a slower answer never
 * replaces a newer selection. Leaving aborts it and clears the timer.
 */
@Injectable()
export class ReviewDetailStore {
  private readonly api = inject(REVIEW_QUEUE_API);

  private readonly _state = signal<ReviewDetailState>('idle');
  private readonly _view = signal<ReviewDetailView | null>(null);
  private readonly _skeleton = signal(false);
  private readonly _id = signal<string | null>(null);
  private request: AbortController | null = null;
  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  readonly view = this._view.asReadonly();
  /** True once the detail has been awaited for 300 ms (L2-033, criteria 1 and 5). */
  readonly skeleton = this._skeleton.asReadonly();
  /** The item open, or being opened. */
  readonly id = this._id.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());
  }

  /** Opens an item; opening the one already open, or being opened, asks nothing. */
  open(id: string): Promise<void> {
    if (id === this._id() && this._state() !== 'failed') {
      return Promise.resolve();
    }
    return this.load(id);
  }

  /** "Try again" after the detail failed. */
  retry(): Promise<void> {
    const id = this._id();
    return id === null ? Promise.resolve() : this.load(id);
  }

  /** Shows nothing: the panel is hidden, or nothing waits. */
  close(): void {
    this.request?.abort();
    this.request = null;
    this.stopSkeletonTimer();
    this._id.set(null);
    this._view.set(null);
    this._skeleton.set(false);
    this._state.set('idle');
  }

  private async load(id: string): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this._id.set(id);
    this._view.set(null);
    this._state.set('loading');
    this._skeleton.set(false);
    this.stopSkeletonTimer();
    this.skeletonTimer = setTimeout(() => this._skeleton.set(true), SKELETON_DELAY_MS);
    try {
      const detail = await this.api.item(id, request.signal);
      if (request.signal.aborted) {
        return;
      }
      const view = toReviewDetailView(detail, new Date());
      this._view.set(view);
      this._state.set(view === null ? 'gone' : 'loaded');
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      if (!isApiError(error)) {
        throw error;
      }
      this._state.set(error.code === 'not_found' ? 'gone' : 'failed');
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
