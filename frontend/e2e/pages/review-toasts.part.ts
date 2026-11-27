import type { Locator, Page } from '@playwright/test';

/** Admin's toasts (cr-toast in Admin's region, docs/mocks/notifications/review-toast/). */
export class ReviewToastsPart {
  readonly region: Locator;
  /** Every toast, oldest first. */
  readonly toasts: Locator;
  readonly titles: Locator;

  constructor(page: Page) {
    this.region = page.locator('.review-page__toasts .toast-region');
    this.toasts = this.region.locator('.toast');
    this.titles = this.toasts.locator('.toast__title');
  }

  /** The toast whose title is `title`. */
  toast(title: string): Locator {
    return this.toasts.filter({
      has: this.region.page().locator('.toast__title', { hasText: title }),
    });
  }

  /** Every toast's text, oldest first. */
  texts(): Locator {
    return this.toasts.locator('.toast__text');
  }

  text(title: string): Locator {
    return this.toast(title).locator('.toast__text');
  }

  action(title: string, name: string): Locator {
    return this.toast(title).getByRole('button', { name, exact: true });
  }

  dismiss(title: string): Locator {
    return this.toast(title).getByRole('button', { name: 'Dismiss', exact: true });
  }
}
