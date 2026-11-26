import type { Locator, Page } from '@playwright/test';

/** Admin: the rail, the review queue and the selected item's detail. */
export class AdminPage {
  readonly heading: Locator;
  readonly summary: Locator;
  readonly phoneNote: Locator;

  readonly nav: Locator;
  readonly navLabel: Locator;
  readonly reviewLink: Locator;
  readonly waitingCount: Locator;
  readonly backToSite: Locator;

  /** Each row of the queue, a button from tablet width up. */
  readonly rows: Locator;
  readonly rowTitles: Locator;
  readonly rowDetails: Locator;
  readonly rowTags: Locator;
  readonly rowThumbs: Locator;
  readonly rowButtons: Locator;
  readonly currentRow: Locator;

  /** The queue's loading rows, and its message when it is empty or did not load. */
  readonly skeletonRows: Locator;
  readonly queueMessageTitle: Locator;
  readonly queueMessageText: Locator;
  readonly queueTryAgain: Locator;
  /** The panel's loading shape, and what it says when an item cannot be shown. */
  readonly detailSkeleton: Locator;
  readonly detailAlert: Locator;
  readonly detailTryAgain: Locator;
  readonly reloadQueue: Locator;

  /** What follows the last row while more items wait. */
  readonly more: Locator;
  readonly moreText: Locator;
  readonly moreStatus: Locator;
  readonly moreAlert: Locator;
  readonly moreButton: Locator;

  readonly detail: Locator;
  readonly detailTitle: Locator;
  readonly detailPrice: Locator;
  readonly detailTag: Locator;
  readonly detailNote: Locator;
  readonly detailPhoto: Locator;
  readonly detailMorePhotos: Locator;
  readonly detailNoPhoto: Locator;
  readonly detailWanted: Locator;
  readonly detailReport: Locator;
  readonly detailMember: Locator;
  readonly detailControls: Locator;
  readonly viewOnSite: Locator;
  /** The decision bar under the item. */
  readonly decisionButtons: Locator;
  readonly approve: Locator;
  readonly keep: Locator;
  readonly remove: Locator;

  /** Admin's notifications, newest at the bottom; the shell has a region of its own. */
  readonly toastRegion: Locator;
  readonly toasts: Locator;
  readonly toastTitles: Locator;
  readonly toastTexts: Locator;

  private readonly facts: Locator;
  private readonly queue: Locator;

  constructor(private readonly page: Page) {
    const main = page.locator('main#main');
    this.heading = main.getByRole('heading', { level: 1, name: 'Review' });
    this.summary = main.locator('.queue__summary');
    this.phoneNote = main.locator('.phone-only-note');

    this.nav = page.getByRole('navigation', { name: 'Admin' });
    this.navLabel = this.nav.locator('.admin-nav__label');
    this.reviewLink = this.nav.getByRole('link', { name: 'Review queue' });
    this.waitingCount = this.nav.locator('.admin-nav__count');
    this.backToSite = this.nav.getByRole('link', { name: 'Back to site' });

    const queue = main.locator('.admin__queue');
    this.rows = queue.locator('.queue-item:not(.queue-item--loading)');
    this.skeletonRows = queue.locator('.queue-item--loading');
    this.queueMessageTitle = queue.locator('.empty__title');
    this.queueMessageText = queue.locator('.empty__text');
    this.queueTryAgain = queue
      .locator('.empty__actions')
      .getByRole('button', { name: 'Try again' });
    this.rowTitles = queue.locator('.queue-item__title');
    this.rowDetails = queue.locator('.queue-item__meta');
    this.rowTags = queue.locator('.queue-item .tag');
    this.rowThumbs = queue.locator('.queue-item__thumb');
    this.rowButtons = queue.locator('button.queue-item');
    this.currentRow = queue.locator('.queue-item[aria-current="true"]');

    this.more = queue.locator('.queue__more');
    this.moreText = this.more.locator('p');
    this.moreStatus = this.more.getByRole('status');
    this.moreAlert = this.more.getByRole('alert');
    this.moreButton = this.more.getByRole('button');
    this.queue = queue;

    this.detail = page.getByRole('region', { name: 'Detail' });
    this.detailSkeleton = this.detail.locator('.review--loading');
    this.detailAlert = this.detail.getByRole('alert');
    this.detailTryAgain = this.detail.getByRole('button', { name: 'Try again' });
    this.reloadQueue = this.detail.getByRole('button', { name: 'Reload the queue' });
    this.detailTitle = this.detail.getByRole('heading', { level: 2 });
    this.detailPrice = this.detail.locator('.review__price');
    this.detailTag = this.detail.locator('.review .tag');
    this.detailNote = this.detail.locator('.review__note');
    this.detailPhoto = this.detail.locator('img.review__photo');
    this.detailMorePhotos = this.detail.locator('.review__photos img');
    this.detailNoPhoto = this.detail.getByRole('img', { name: 'This listing has no photo' });
    this.detailWanted = this.detail.locator('.review__wanted');
    this.detailReport = this.detail.locator('.review__report');
    this.detailMember = this.detail.locator('.review__member');
    this.detailControls = this.detail.locator('button, a');
    this.viewOnSite = this.detail.getByRole('link', { name: 'View on site' });
    this.facts = this.detail.locator('.review__facts > div');

    const bar = this.detail.locator('.decision-bar');
    this.decisionButtons = bar.getByRole('button');
    this.approve = bar.getByRole('button', { name: 'Approve', exact: true });
    this.keep = bar.getByRole('button', { name: 'Keep listing', exact: true });
    this.remove = bar.getByRole('button', { name: 'Remove', exact: true });

    this.toastRegion = page.locator('cr-review-page .toast-region');
    this.toasts = this.toastRegion.locator('.toast');
    this.toastTitles = this.toastRegion.locator('.toast__title');
    this.toastTexts = this.toastRegion.locator('.toast__text');
  }

  async open(): Promise<void> {
    await this.page.goto('/admin');
  }

  /** The row of the item with this title or name. */
  row(title: string): Locator {
    return this.rows.filter({ hasText: title });
  }

  async select(title: string): Promise<void> {
    await this.row(title).click();
  }

  /** Scrolls the queue, which from tablet width scrolls on its own, to its end. */
  async scrollToEnd(): Promise<void> {
    await this.queue.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  }

  async scrollToStart(): Promise<void> {
    await this.queue.evaluate((element) => element.scrollTo(0, 0));
  }

  /** The detail's facts as "term: value", in order. */
  async detailFacts(): Promise<string[]> {
    return this.facts.evaluateAll((facts) =>
      facts.map((fact) => {
        const text = (selector: string) =>
          (fact.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return `${text('dt')}: ${text('dd')}`;
      }),
    );
  }
}
