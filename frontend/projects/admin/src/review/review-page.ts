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
  viewChild,
} from '@angular/core';
import { SESSION } from '@rent/api';
import {
  AdminLayout,
  AdminNav,
  Button,
  EmptyState,
  Icon,
  QueueHeader,
  QueueItem,
  QueueList,
  QueueMore,
  ReviewDetail,
} from '@rent/components';
import { queueSummary } from '@rent/domain';
import { ReviewQueueStore } from './review-queue-store';

/** From this width the detail panel sits beside the queue (L2-031, criterion 5). */
const WIDE = '(min-width: 48rem)';

/**
 * Admin: the review queue and, from tablet width, the selected item's detail beside it
 * (view-review-queue design; L2-019). A phone shows only the queue, and asks for no detail.
 * One `IntersectionObserver` watches the ends of the rows, so the next page, or a released one,
 * loads as it is reached; released pages leave spacers of their height. It watches the spacers
 * too, so a jump into one, as the Home key makes, loads what belongs there.
 * Leaving stops watching the sentinels and the screen's width, and the store, which goes with
 * the route, aborts what it was loading.
 */
@Component({
  selector: 'cr-review-page',
  imports: [
    AdminLayout,
    AdminNav,
    Button,
    EmptyState,
    Icon,
    QueueHeader,
    QueueItem,
    QueueList,
    QueueMore,
    ReviewDetail,
  ],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Provided here, not by the route, whose providers would outlive the screen: leaving Admin
  // destroys the store, which aborts what it was loading.
  providers: [ReviewQueueStore],
  host: {
    '[style.--review-before.px]': 'store.before()',
    '[style.--review-after.px]': 'store.after()',
  },
})
export class ReviewPage {
  protected readonly skeletons = Array.from({ length: 6 });

  protected readonly store = inject(ReviewQueueStore);
  private readonly member = inject(SESSION).member;
  protected readonly name = computed(() => this.member()?.name ?? '');

  private readonly media = window.matchMedia(WIDE);
  protected readonly wide = signal(this.media.matches);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly above = viewChild<ElementRef<HTMLElement>>('above');
  private readonly top = viewChild<ElementRef<HTMLElement>>('top');
  private readonly bottom = viewChild<ElementRef<HTMLElement>>('bottom');
  private readonly below = viewChild<ElementRef<HTMLElement>>('below');
  /** What stands at each end of the rows: reaching any of them asks for the page there. */
  private readonly ends = computed(() => ({
    up: [this.above(), this.top()],
    down: [this.bottom(), this.below()],
  }));
  private observer: IntersectionObserver | null = null;

  constructor() {
    const resized = () => this.wide.set(this.media.matches);
    this.media.addEventListener('change', resized);
    inject(DestroyRef).onDestroy(() => this.media.removeEventListener('change', resized));

    effect(() => {
      const wide = this.wide();
      untracked(() => this.store.showDetail(wide));
    });
    void this.store.load();

    // The queue scrolls with the page on a phone and on its own from tablet width; the
    // viewport, which both are seen through, is the observer's root.
    afterNextRender(() => {
      this.observer = new IntersectionObserver((entries) => this.reached(entries));
    });
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());

    // The ends exist only while the queue is shown; watch them whenever they are drawn.
    effect(() => {
      this.ends();
      afterNextRender(() => this.watch(), { injector: this.injector });
    });
  }

  /** The line under the heading. */
  protected readonly summary = computed(() =>
    queueSummary({
      state: this.store.state(),
      told: this.store.skeleton(),
      waiting: this.store.waitingCount(),
      held: this.store.held(),
    }),
  );

  /** "Load 13 more" and "Try again" after the next page failed. */
  protected loadMore(): void {
    void this.load('down');
  }

  private reached(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }
      const is = (end: ElementRef<HTMLElement> | undefined) => end?.nativeElement === entry.target;
      if (this.ends().down.some(is) && this.store.moreState() === 'idle') {
        void this.load('down');
      } else if (this.ends().up.some(is) && this.store.hasBefore()) {
        void this.load('up');
      }
    }
  }

  private async load(direction: 'up' | 'down'): Promise<void> {
    await this.store.loadMore(direction, (index) => this.measure(index));
    // An end still in reach after the page is drawn asks for the next one.
    afterNextRender(() => this.watch(), { injector: this.injector });
  }

  /** Observing afresh reports whether each end is in reach now. */
  private watch(): void {
    if (!this.observer) {
      return;
    }
    this.observer.disconnect();
    const { up, down } = this.ends();
    for (const end of [...up, ...down]) {
      if (end) {
        this.observer.observe(end.nativeElement);
      }
    }
  }

  /**
   * The height a held page takes in the list: from its first row to the next page's first row,
   * or, for the last page, to the end of its last row.
   */
  private measure(index: number): number {
    const rows = this.host.querySelectorAll<HTMLElement>(`li[data-page="${index}"]`);
    const first = rows[0];
    if (!first) {
      return 0;
    }
    const top = first.getBoundingClientRect().top;
    const next = this.host.querySelector<HTMLElement>(`li[data-page="${index + 1}"]`);
    const end = next
      ? next.getBoundingClientRect().top
      : rows[rows.length - 1]!.getBoundingClientRect().bottom;
    return end - top;
  }
}
