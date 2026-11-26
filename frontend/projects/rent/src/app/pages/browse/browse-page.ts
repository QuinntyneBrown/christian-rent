import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import {
  Button,
  EmptyState,
  FeedStatus,
  Hero,
  Icon,
  ListingCard,
  ListingGrid,
  SiteHeader,
} from '@rent/components';
import { BrowseStore } from './browse-store';

/** How far beyond the viewport a sentinel starts a request, so a page is there before it is reached. */
const LOOK_AHEAD = '1200px 0px';

/**
 * Browse, the home screen (browse-listings design): the headline with the two buttons that lead
 * to posting, and approved listings, newest first, loaded a page at a time as the person reaches
 * the end of the list (L2-006). One `IntersectionObserver` watches a sentinel above and below the
 * cards; the pages released from memory leave spacers of their height (ADR 0013). Leaving Browse
 * disconnects the observer, and the store aborts its request. Search-and-filter adds the search
 * bar and the switch.
 */
@Component({
  selector: 'cr-browse-page',
  imports: [
    Button,
    EmptyState,
    FeedStatus,
    Hero,
    Icon,
    ListingCard,
    ListingGrid,
    NgTemplateOutlet,
    RouterLink,
    SiteHeader,
  ],
  providers: [BrowseStore],
  templateUrl: './browse-page.html',
  styleUrl: './browse-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--browse-before.px]': 'store.before()',
    '[style.--browse-after.px]': 'store.after()',
  },
})
export class BrowsePage {
  protected readonly member = inject(SESSION).member;
  protected readonly store = inject(BrowseStore);
  /** Eight skeleton cards: two rows at the widest, enough to fill a phone (L2-033, criterion 1). */
  protected readonly skeletons = Array.from({ length: 8 });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly top = viewChild<ElementRef<HTMLElement>>('top');
  private readonly bottom = viewChild<ElementRef<HTMLElement>>('bottom');
  private observer: IntersectionObserver | null = null;

  constructor() {
    void this.store.loadFirst();

    afterNextRender(() => {
      this.observer = new IntersectionObserver((entries) => this.reached(entries), {
        rootMargin: LOOK_AHEAD,
      });
    });
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());

    // The sentinels exist only while the list is shown; watch them whenever they are drawn.
    effect(() => {
      const sentinels = [this.top(), this.bottom()];
      afterNextRender(() => this.watch(sentinels), { injector: this.injector });
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
      if (entry.target === this.bottom()?.nativeElement && this.store.moreState() === 'idle') {
        void this.load('down');
      } else if (entry.target === this.top()?.nativeElement && this.store.hasBefore()) {
        void this.load('up');
      }
    }
  }

  private async load(direction: 'up' | 'down'): Promise<void> {
    await this.store.loadMore(direction, (index) => this.measure(index));
    // A sentinel still in reach after the page is drawn asks for the next one.
    afterNextRender(() => this.watch([this.top(), this.bottom()]), { injector: this.injector });
  }

  /** Observing afresh reports whether each sentinel is in reach now. */
  private watch(sentinels: (ElementRef<HTMLElement> | undefined)[]): void {
    if (!this.observer) {
      return;
    }
    this.observer.disconnect();
    for (const sentinel of sentinels) {
      if (sentinel) {
        this.observer.observe(sentinel.nativeElement);
      }
    }
  }

  /**
   * The height a held page takes in the grid: from its first card to the next page's first card,
   * or, for the last page, to the end of its lowest card and one row gap. A page of 24 fills
   * whole rows at every width, so a spacer of this height keeps every card below in place.
   */
  private measure(index: number): number {
    const cards = Array.from(this.host.querySelectorAll<HTMLElement>(`li[data-page="${index}"]`));
    if (cards.length === 0) {
      return 0;
    }
    const top = cards[0]!.getBoundingClientRect().top;
    const next = this.host.querySelector<HTMLElement>(`li[data-page="${index + 1}"]`);
    if (next) {
      return next.getBoundingClientRect().top - top;
    }
    const bottom = Math.max(...cards.map((card) => card.getBoundingClientRect().bottom));
    const gap = parseFloat(getComputedStyle(cards[0]!.parentElement!).rowGap) || 0;
    return bottom - top + gap;
  }
}
