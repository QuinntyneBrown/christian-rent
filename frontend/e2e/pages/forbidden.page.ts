import type { Locator, Page } from '@playwright/test';

/** Admin's forbidden page: what anyone signed in to Admin who is not an admin finds there. */
export class ForbiddenPage {
  readonly logo: Locator;
  readonly wordmark: Locator;
  readonly label: Locator;
  readonly heading: Locator;
  readonly text: Locator;
  readonly goToSite: Locator;
  readonly signOut: Locator;
  readonly tryAgain: Locator;

  constructor(private readonly page: Page) {
    const gate = page.locator('.admin-gate');
    this.logo = gate.locator('.logo');
    this.wordmark = gate.locator('.wordmark');
    this.label = gate.locator('.admin-gate__label');
    const content = page.locator('main#main .plain-page');
    this.heading = content.getByRole('heading', { level: 1 });
    this.text = content.locator('.plain-page__text');
    this.goToSite = content.getByRole('link', { name: 'Go to christian.rent' });
    this.signOut = content.getByRole('button', { name: 'Sign out' });
    this.tryAgain = content.getByRole('button', { name: 'Try again' });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }
}
