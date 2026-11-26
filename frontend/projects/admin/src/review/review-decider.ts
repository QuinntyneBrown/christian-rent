import { Injectable, inject, signal } from '@angular/core';
import { REVIEW_QUEUE_API, type ReviewDecision, isApiError } from '@rent/api';
import { alreadyDecidedWords } from '@rent/domain';
import { ReviewDetailStore } from './review-detail-store';
import { ReviewQueueStore } from './review-queue-store';

/** How a decision ended: saved, refused because another admin decided first, or not saved. */
export type DecideResult = 'decided' | 'already' | 'failed';

/** Opens an item, or the first waiting when null, by the address (ADR 0024). */
export type SelectItem = (id: string | null) => Promise<unknown>;

/** Another admin decided the open item first: what the panel says, and where to go next. */
export interface DecidedElsewhere {
  readonly id: string;
  readonly text: string;
  readonly next: string | null;
}

/**
 * Sends an admin's decision on the open item and moves the screen on (decide-review-item design;
 * ADR 0025). A decision saved selects the next item, then drops this one from the queue. One
 * another admin made first also drops it, while the panel keeps it with a warning and its
 * decisions off. One not saved changes nothing. One decision is in flight at a time.
 */
@Injectable()
export class ReviewDecider {
  private readonly api = inject(REVIEW_QUEUE_API);
  private readonly queue = inject(ReviewQueueStore);
  private readonly detail = inject(ReviewDetailStore);

  private readonly _deciding = signal<ReviewDecision | null>(null);
  private readonly _elsewhere = signal<DecidedElsewhere | null>(null);

  /** The decision being sent, or null. */
  readonly deciding = this._deciding.asReadonly();
  /** The open item another admin decided first, or null. */
  readonly elsewhere = this._elsewhere.asReadonly();

  /** Sends `decision` on the open item; `select` changes the selection in the address. */
  async decide(decision: ReviewDecision, select: SelectItem): Promise<DecideResult | null> {
    const id = this.detail.id();
    const item = this.detail.detail();
    if (id === null || item === null || this._deciding() !== null) {
      return null;
    }
    this._deciding.set(decision);
    try {
      await this.api.decide(id, decision);
      await select(this.queue.nextAfter(id));
      this.queue.drop(id);
      return 'decided';
    } catch (error) {
      if (!isApiError(error)) {
        throw error;
      }
      if (error.code === 'already_decided' && error.decided !== null) {
        const next = this.queue.nextAfter(id);
        // The address names the item, so the panel keeps it once it leaves the queue.
        await select(id);
        this.queue.drop(id);
        this._elsewhere.set({ id, text: alreadyDecidedWords(item, error.decided).panel, next });
        return 'already';
      }
      return 'failed';
    } finally {
      this._deciding.set(null);
    }
  }

  /** "Go to the next item" after another admin decided first. */
  async next(select: SelectItem): Promise<void> {
    const elsewhere = this._elsewhere();
    this._elsewhere.set(null);
    await select(elsewhere?.next ?? null);
  }

  /** The panel moved to another item: the warning goes with the item it was about. */
  forget(id: string | null): void {
    if (this._elsewhere()?.id !== id) {
      this._elsewhere.set(null);
    }
  }
}
