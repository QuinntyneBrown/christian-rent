import type { Locator, Page } from '@playwright/test';

/** Admin: the review queue and the selected item's detail. */
export class AdminPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('main#main').getByRole('heading', { level: 1, name: 'Review' });
  }

  async open(): Promise<void> {
    await this.page.goto('/admin');
  }
}
