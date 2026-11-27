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
  /** The decision buttons under the detail, in order. */
  readonly decisions: Locator;
  readonly approve: Locator;
  readonly keep: Locator;
  readonly remove: Locator;
  /** The warning above an item another admin decided first. */
  readonly decidedNotice: Locator;
  readonly decidedTitle: Locator;
  readonly decidedText: Locator;
  readonly goToNext: Locator;

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
    this.detailJoined = this.detail.locator('.review__joined');
    this.viewOnSite = this.detail.getByRole('link', { name: 'View on site' });
    this.detailSkeleton = this.detail.locator('.skeleton');
    this.detailFailed = this.detail.locator('.empty--error');
    this.decisions = this.detail.locator('.decision-bar button');
    this.approve = this.detail.getByRole('button', { name: 'Approve', exact: true });
    this.keep = this.detail.getByRole('button', { name: 'Keep listing', exact: true });
    this.remove = this.detail.getByRole('button', { name: 'Remove', exact: true });
    this.decidedNotice = this.detail.locator('.alert--warning');
    this.decidedTitle = this.decidedNotice.locator('.alert__title');
    this.decidedText = this.decidedNotice.locator('.alert__text');
    this.goToNext = this.decidedNotice.getByRole('button', { name: 'Go to the next item' });
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

  /** Hides the page, as switching to another tab does, or shows it again. */
  async setHidden(hidden: boolean): Promise<void> {
    await this.page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (value ? 'hidden' : 'visible'),
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
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
