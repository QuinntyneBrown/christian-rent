import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { SESSION } from '@rent/api';
import {
  AdminLayout,
  AdminNav,
  Button,
  EmptyState,
  Icon,
  Queue,
  QueueItem,
} from '@rent/components';
import { ReviewQueueStore } from './review-queue-store';

/**
 * Admin (view-review-queue design): the review queue, oldest first, and from 768 px the detail
 * panel beside it. Its route is matched only for an admin (ADR 0024). The items are held in a
 * window of 3 pages: one `IntersectionObserver` watches the first and the last item held, and
 * reaching either asks for the page beyond it. Leaving disconnects the observer, and the store,
 * provided here, aborts its request.
 */
@Component({
  selector: 'cr-review-page',
  imports: [AdminLayout, AdminNav, Button, EmptyState, Icon, Queue, QueueItem],
  providers: [ReviewQueueStore],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  private readonly member = inject(SESSION).member;
  protected readonly store = inject(ReviewQueueStore);

  protected readonly name = computed(() => this.member()?.name ?? '');
  protected readonly headingId = 'queue-title';
  /** Six rows in the shape of the queue (L2-033, criterion 1). */
  protected readonly skeletons = Array.from({ length: 6 });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private observer: IntersectionObserver | null = null;

  constructor() {
    void this.store.load();

    afterNextRender(() => {
      this.observer = new IntersectionObserver((entries) => this.reached(entries));
    });
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());

    // Watch the ends of the list whenever the items held change.
    effect(() => {
      this.store.pages();
      afterNextRender(() => this.watch(), { injector: this.injector });
    });
  }

  /** "Try again" after the next page failed. */
  protected loadMore(): void {
    void this.load('down');
  }

  private reached(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }
      const end = (entry.target as HTMLElement).dataset['end'];
      if (end === 'last' && this.store.more() === 'idle') {
        void this.load('down');
      } else if (end === 'first' && this.store.hasBefore()) {
        void this.load('up');
      }
    }
  }

  private async load(direction: 'up' | 'down'): Promise<void> {
    await this.store.loadMore(direction, (index) => this.measure(index));
  }

  /** Observing afresh reports whether either end is in reach now. */
  private watch(): void {
    if (!this.observer) {
      return;
    }
    this.observer.disconnect();
    const rows = this.host.querySelectorAll<HTMLElement>('li[data-page]');
    const first = rows[0];
    const last = rows[rows.length - 1];
    for (const [row, end] of [
      [first, 'first'],
      [last, 'last'],
    ] as const) {
      if (row) {
        row.dataset['end'] = end;
        this.observer.observe(row);
      }
    }
  }

  /**
   * The height a held page takes in the list: from its first item to the next page's first
   * item, or, for the last page, to the end of its last item.
   */
  private measure(index: number): number {
    const rows = Array.from(this.host.querySelectorAll<HTMLElement>(`li[data-page="${index}"]`));
    if (rows.length === 0) {
      return 0;
    }
    const top = rows[0]!.getBoundingClientRect().top;
    const next = this.host.querySelector<HTMLElement>(`li[data-page="${index + 1}"]`);
    if (next) {
      return next.getBoundingClientRect().top - top;
    }
    const gap = parseFloat(getComputedStyle(rows[0]!.parentElement!).rowGap) || 0;
    return rows[rows.length - 1]!.getBoundingClientRect().bottom - top + gap;
  }
}
