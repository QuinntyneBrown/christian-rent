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
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SESSION } from '@rent/api';
import {
  AdminLayout,
  AdminNav,
  Button,
  EmptyState,
  Icon,
  Queue,
  QueueItem,
  ReviewDetail,
} from '@rent/components';
import { selectedItem } from '@rent/domain';
import { map } from 'rxjs';
import { ReviewDetailStore } from './review-detail-store';
import { ReviewQueueStore } from './review-queue-store';

/** From this width the detail panel is shown beside the queue (L2-031, criterion 5). */
const WIDE = '(min-width: 48rem)';

/**
 * Admin (view-review-queue design): the review queue, oldest first, and from 768 px the detail
 * panel beside it. Its route is matched only for an admin (ADR 0024). The items are held in a
 * window of 3 pages: one `IntersectionObserver` watches the first and the last item held, and
 * reaching either asks for the page beyond it. The address holds the selection,
 * `/admin?item={id}`, and the detail is asked for only while the panel is shown, from 768 px
 * (ADR 0024). Leaving disconnects the observer and the width listener, and the stores, provided
 * here, abort their requests.
 */
@Component({
  selector: 'cr-review-page',
  imports: [AdminLayout, AdminNav, Button, EmptyState, Icon, Queue, QueueItem, ReviewDetail],
  providers: [ReviewQueueStore, ReviewDetailStore],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  private readonly member = inject(SESSION).member;
  protected readonly store = inject(ReviewQueueStore);
  protected readonly detail = inject(ReviewDetailStore);

  private readonly requested = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('item'))),
    { initialValue: null },
  );
  /** True while the detail panel is shown. */
  private readonly wide = signal(false);
  /** The item the detail panel shows, and the queue marks as current. */
  protected readonly selected = computed(() =>
    selectedItem(
      this.requested(),
      this.store.items().map((item) => item.id),
      untracked(this.detail.id),
    ),
  );

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
    this.watchWidth();

    // Open the selected item while the panel is shown; a phone asks for no detail.
    effect(() => {
      const id = this.selected();
      const wide = this.wide();
      untracked(() => {
        if (id === null || !wide) {
          this.detail.close();
        } else {
          void this.detail.open(id);
        }
      });
    });

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

  private watchWidth(): void {
    if (typeof matchMedia !== 'function') {
      return;
    }
    const query = matchMedia(WIDE);
    const change = () => this.wide.set(query.matches);
    change();
    query.addEventListener('change', change);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', change));
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
