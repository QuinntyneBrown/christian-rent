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
import { ActivatedRoute, Router } from '@angular/router';
import { type ReviewDecision, SESSION } from '@rent/api';
import {
  AdminLayout,
  AdminNav,
  Alert,
  Button,
  EmptyState,
  Icon,
  Queue,
  QueueItem,
  ReviewDetail,
  Toast,
  ToastRegion,
} from '@rent/components';
import { confirmRemoveWords, selectedItem } from '@rent/domain';
import { map } from 'rxjs';
import { ReviewDecider } from './review-decider';
import { ReviewDetailStore } from './review-detail-store';
import { ReviewQueueStore } from './review-queue-store';
import { ToastQueue } from './toast-queue';

/** From this width the detail panel is shown beside the queue (L2-031, criterion 5). */
const WIDE = '(min-width: 48rem)';

/**
 * Admin (view-review-queue design): the review queue, oldest first, and from 768 px the detail
 * panel beside it. Its route is matched only for an admin (ADR 0024). The items are held in a
 * window of 3 pages: one `IntersectionObserver` watches the first and the last item held, and
 * reaching either asks for the page beyond it. The address holds the selection,
 * `/admin?item={id}`, and the detail is asked for only while the panel is shown, from 768 px
 * (ADR 0024). Leaving disconnects the observer and the width listener, and the stores, provided
 * here, abort their requests. A decision selects the next item and moves focus to it; Remove asks
 * first in a dialog whose code loads only then (ADR 0025).
 */
@Component({
  selector: 'cr-review-page',
  imports: [
    AdminLayout,
    AdminNav,
    Alert,
    Button,
    EmptyState,
    Icon,
    Queue,
    QueueItem,
    ReviewDetail,
    Toast,
    ToastRegion,
  ],
  providers: [ReviewQueueStore, ReviewDetailStore, ToastQueue, ReviewDecider],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  private readonly member = inject(SESSION).member;
  protected readonly store = inject(ReviewQueueStore);
  protected readonly detail = inject(ReviewDetailStore);
  protected readonly decider = inject(ReviewDecider);
  protected readonly toasts = inject(ToastQueue);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly requested = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('item'))),
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
  private destroyed = false;
  /** After a decision, focus goes to the title of the item that opens next. */
  private focusNext = false;
  private closeDialog: (() => void) | null = null;
  /** Changes the selection in the address, as a click on an item would. */
  private readonly select = (id: string | null) =>
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { item: id },
      replaceUrl: true,
    });

  /** The warning about the open item, when another admin decided it first. */
  protected readonly elsewhere = computed(() => {
    const elsewhere = this.decider.elsewhere();
    return elsewhere !== null && elsewhere.id === this.detail.id() ? elsewhere : null;
  });

  constructor() {
    void this.store.load();

    afterNextRender(() => {
      this.observer = new IntersectionObserver((entries) => this.reached(entries));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.observer?.disconnect();
      this.closeDialog?.();
    });
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

    // The warning goes with the item it was about; focus follows a decision to the next item.
    effect(() => {
      const id = this.detail.id();
      const state = this.detail.state();
      untracked(() => {
        this.decider.forget(id);
        if (state === 'loaded' && this.focusNext) {
          this.focusNext = false;
          afterNextRender(() => this.host.querySelector<HTMLElement>('.review__title')?.focus(), {
            injector: this.injector,
          });
        }
      });
    });

    // Watch the ends of the list whenever the items held change.
    effect(() => {
      this.store.pages();
      afterNextRender(() => this.watch(), { injector: this.injector });
    });
  }

  /** A decision button: Remove asks first; Approve and Keep listing are sent at once. */
  protected async decide(decision: ReviewDecision): Promise<void> {
    if (decision === 'remove') {
      await this.confirmRemove();
      return;
    }
    const result = await this.decider.decide(decision, this.select);
    if (result === 'decided') {
      this.focusNext = true;
    }
  }

  /** "Go to the next item" after another admin decided first. */
  protected async next(): Promise<void> {
    this.focusNext = true;
    await this.decider.next(this.select);
  }

  private async confirmRemove(): Promise<void> {
    const item = this.detail.detail();
    if (item === null || this.closeDialog !== null) {
      return;
    }
    const [{ Dialog }, { openConfirmRemoveDialog }] = await Promise.all([
      import('@angular/cdk/dialog'),
      import('./confirm-remove-dialog'),
    ]);
    if (this.destroyed || this.detail.detail() !== item) {
      return;
    }
    const dialog = openConfirmRemoveDialog(
      this.injector.get(Dialog),
      {
        words: confirmRemoveWords(item),
        remove: () => this.decider.decide('remove', this.select, { failureShown: true }),
      },
      this.injector,
    );
    this.closeDialog = () => dialog.close();
    dialog.closed.subscribe((result) => {
      this.closeDialog = null;
      if (result === 'decided') {
        this.focusNext = true;
      }
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
