import type { Locator, Page } from '@playwright/test';

/** Admin (`/admin`): the review queue, and from 768 px the detail panel beside it. */
export class AdminPage {
  readonly nav: Locator;
  readonly navLabel: Locator;
  readonly reviewLink: Locator;
  readonly reviewCount: Locator;
  readonly backToSite: Locator;
  readonly queue: Locator;
  readonly heading: Locator;
  readonly summary: Locator;
  readonly phoneNote: Locator;
  readonly items: Locator;
  readonly skeletonRows: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly tryAgain: Locator;
  readonly moreFailed: Locator;
  readonly detail: Locator;
  readonly detailTitle: Locator;
  readonly detailPrice: Locator;
  readonly detailTag: Locator;
  readonly detailNote: Locator;
  readonly detailPhoto: Locator;
  readonly detailWanted: Locator;
  readonly detailReport: Locator;
  readonly detailJoined: Locator;
  readonly viewOnSite: Locator;
  readonly detailSkeleton: Locator;
  readonly detailFailed: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Admin' });
    this.navLabel = this.nav.locator('.admin-nav__label');
    this.reviewLink = this.nav.getByRole('link', { name: 'Review queue' });
    this.reviewCount = this.nav.locator('.admin-nav__count');
    this.backToSite = this.nav.getByRole('link', { name: 'Back to site' });
    this.queue = page.locator('.admin__queue');
    this.heading = this.queue.getByRole('heading', { level: 1 });
    this.summary = this.queue.locator('.queue__summary');
    this.phoneNote = this.queue.locator('.phone-only-note');
    this.items = this.queue.locator('a.queue-item');
    this.skeletonRows = this.queue.locator('.queue-item .skeleton');
    this.empty = this.queue.locator('.empty');
    this.emptyTitle = this.empty.locator('.empty__title');
    this.emptyText = this.empty.locator('.empty__text');
    this.tryAgain = this.queue.getByRole('button', { name: 'Try again' });
    this.moreFailed = this.queue.locator('.queue__more');
    this.detail = page.locator('.admin__detail');
    this.detailTitle = this.detail.locator('.review__title');
    this.detailPrice = this.detail.locator('.review__price');
    this.detailTag = this.detail.locator('.review .tag').first();
    this.detailNote = this.detail.locator('.review__note');
    this.detailPhoto = this.detail.locator('img.review__photo');
    this.detailWanted = this.detail.locator('.review__wanted');
    this.detailReport = this.detail.locator('.review__report');
    this.detailJoined = this.detail.locator('.review__member .text-muted');
    this.viewOnSite = this.detail.getByRole('link', { name: 'View on site' });
    this.detailSkeleton = this.detail.locator('.skeleton');
    this.detailFailed = this.detail.locator('.empty--error');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/admin${query}`);
  }

  /** The queue item whose title is `title`. */
  item(title: string): Locator {
    return this.items.filter({
      has: this.page.locator('.queue-item__title', { hasText: new RegExp(`^${escape(title)}$`) }),
    });
  }

  itemMeta(title: string): Locator {
    return this.item(title).locator('.queue-item__meta');
  }

  itemTag(title: string): Locator {
    return this.item(title).locator('.tag');
  }

  itemThumb(title: string): Locator {
    return this.item(title).locator('.queue-item__thumb');
  }

  /** The value of the detail's fact named `name`, such as "Posted by". */
  fact(name: string): Locator {
    return this.detail
      .locator('.review__facts > div')
      .filter({ has: this.page.locator('dt', { hasText: new RegExp(`^${escape(name)}$`) }) })
      .locator('dd');
  }

  /** The names of the detail's facts, in order. */
  factNames(): Locator {
    return this.detail.locator('.review__facts dt');
  }

  /** Scrolls the queue to its end, where the next page is asked for. */
  async scrollQueueToEnd(): Promise<void> {
    await this.items.last().scrollIntoViewIfNeeded();
  }

  /** Scrolls the queue to its start, where a page released from memory is asked for again. */
  async scrollQueueToStart(): Promise<void> {
    await this.items.first().scrollIntoViewIfNeeded();
    await this.heading.scrollIntoViewIfNeeded();
  }
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
