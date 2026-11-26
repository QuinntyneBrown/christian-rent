import type { Locator, Page } from '@playwright/test';
import { SiteHeaderPart } from './site-header.part';

/** Browse, the home screen. Journey 2 adds its listings; the scaffold holds its shell. */
export class BrowsePage {
  readonly header: SiteHeaderPart;
  readonly skipLink: Locator;
  readonly main: Locator;
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    this.skipLink = page.locator('.skip-link');
    this.main = page.locator('main#main');
    this.heading = this.main.getByRole('heading', { level: 1 });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }
}
