import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { SESSION } from '@rent/api';
import {
  AdminLayout,
  AdminNav,
  QueueHeader,
  QueueItem,
  QueueList,
  ReviewDetail,
} from '@rent/components';
import { ReviewQueueStore } from './review-queue-store';

/** From this width the detail panel sits beside the queue (L2-031, criterion 5). */
const WIDE = '(min-width: 48rem)';

/**
 * Admin: the review queue and, from tablet width, the selected item's detail beside it
 * (view-review-queue design; L2-019). A phone shows only the queue, and asks for no detail.
 * Leaving stops watching the screen's width, and the store, which goes with the route, aborts
 * what it was loading.
 */
@Component({
  selector: 'cr-review-page',
  imports: [AdminLayout, AdminNav, QueueHeader, QueueItem, QueueList, ReviewDetail],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  protected readonly store = inject(ReviewQueueStore);
  private readonly member = inject(SESSION).member;
  protected readonly name = computed(() => this.member()?.name ?? '');

  private readonly media = window.matchMedia(WIDE);
  protected readonly wide = signal(this.media.matches);

  constructor() {
    const resized = () => this.wide.set(this.media.matches);
    this.media.addEventListener('change', resized);
    inject(DestroyRef).onDestroy(() => this.media.removeEventListener('change', resized));

    effect(() => {
      const wide = this.wide();
      untracked(() => this.store.showDetail(wide));
    });
    void this.store.load();
  }

  protected readonly summary = computed(
    () => `${this.store.waitingCount()} waiting · oldest first`,
  );
}
