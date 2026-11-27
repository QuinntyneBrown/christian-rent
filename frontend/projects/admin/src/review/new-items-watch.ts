import { DestroyRef, Injectable, inject } from '@angular/core';
import { newItemsToast } from '@rent/domain';
import { ReviewQueueStore } from './review-queue-store';
import { ToastQueue } from './toast-queue';

/** While Admin is visible the queue is asked again every 60 s (ADR 0025). */
export const POLL_MS = 60_000;

/**
 * New items while the queue is open (L2-019, criterion 12; ADR 0025). While the page is visible
 * it asks every 60 s how many wait; when more have arrived than it has said, an info toast says
 * how many, and "Show them" reads the queue again. Its interval is cleared when Admin is left.
 */
@Injectable()
export class NewItemsWatch {
  private readonly queue = inject(ReviewQueueStore);
  private readonly toasts = inject(ToastQueue);
  private readonly destroyRef = inject(DestroyRef);

  private interval: ReturnType<typeof setInterval> | null = null;
  /** How many arrivals the toast has said, since the queue was read. */
  private said = 0;
  private toast: number | null = null;

  /** Starts asking; a hidden page is not asked. */
  start(): void {
    if (this.interval !== null) {
      return;
    }
    this.interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void this.ask();
      }
    }, POLL_MS);
    this.destroyRef.onDestroy(() => {
      if (this.interval !== null) {
        clearInterval(this.interval);
        this.interval = null;
      }
    });
  }

  private async ask(): Promise<void> {
    const arrived = await this.queue.arrivedSinceLoad();
    if (arrived <= this.said) {
      // The queue was read again since: what was said has been shown.
      this.said = Math.min(this.said, arrived);
      return;
    }
    this.said = arrived;
    if (this.toast !== null) {
      this.toasts.dismiss(this.toast);
    }
    this.toast = this.toasts.push({
      tone: 'info',
      ...newItemsToast(arrived),
      actionLabel: 'Show them',
      action: () => this.show(),
    });
  }

  /** "Show them": the queue is read again, with the new items in it. */
  private show(): void {
    this.said = 0;
    this.toast = null;
    void this.queue.load();
  }
}
