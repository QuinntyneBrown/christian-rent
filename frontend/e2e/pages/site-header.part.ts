import type { Locator, Page } from '@playwright/test';

/** The site header every screen but Admin shows (cr-site-header). */
export class SiteHeaderPart {
  readonly root: Locator;
  readonly logo: Locator;
  readonly wordmark: Locator;
  readonly wordmarkTld: Locator;
  readonly post: Locator;
  readonly close: Locator;
  readonly memberChip: Locator;
  /** Every link and button in the header. */
  readonly controls: Locator;
  readonly messages: Locator;
  readonly signIn: Locator;
  readonly signOut: Locator;

  constructor(page: Page) {
    this.root = page.locator('.site-header');
    this.logo = this.root.locator('.logo');
    this.wordmark = this.root.locator('.wordmark');
    this.wordmarkTld = this.root.locator('.wordmark__tld');
    this.post = this.root.getByRole('link', { name: 'Post' });
    this.close = this.root.getByRole('link', { name: 'Close and go back to Browse' });
    this.memberChip = this.root.locator('.member-chip');
    this.controls = this.root.locator('a, button');
    this.messages = this.root
      .getByRole('link', { name: /messages/i })
      .or(this.root.getByRole('button', { name: /messages/i }));
    this.signIn = this.root
      .getByRole('link', { name: /sign in|log in/i })
      .or(this.root.getByRole('button', { name: /sign in|log in/i }));
    this.signOut = this.root.getByRole('button', { name: 'Sign out' });
  }
}
