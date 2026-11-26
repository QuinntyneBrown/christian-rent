import type { Locator, Page } from '@playwright/test';

/** The site header every screen but Admin shows (cr-site-header). */
export class SiteHeaderPart {
  readonly root: Locator;
  readonly logo: Locator;
  readonly wordmark: Locator;
  readonly post: Locator;
  readonly close: Locator;
  readonly memberChip: Locator;

  constructor(page: Page) {
    this.root = page.locator('.site-header');
    this.logo = this.root.locator('.logo');
    this.wordmark = this.root.locator('.wordmark');
    this.post = this.root.getByRole('link', { name: 'Post' });
    this.close = this.root.getByRole('link', { name: 'Close and go back to Browse' });
    this.memberChip = this.root.locator('.member-chip');
  }
}
