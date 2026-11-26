import type { Locator, Page } from '@playwright/test';
import { SiteHeaderPart } from './site-header.part';

/** "This page is for admins": Admin's address, opened by anyone who is not an admin. */
export class ForbiddenPage {
  readonly header: SiteHeaderPart;
  readonly heading: Locator;
  readonly text: Locator;
  readonly goToBrowse: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    const content = page.locator('main#main .plain-page');
    this.heading = content.getByRole('heading', { level: 1 });
    this.text = content.locator('.plain-page__text');
    this.goToBrowse = content.getByRole('link', { name: 'Go to Browse' });
  }

  async open(): Promise<void> {
    await this.page.goto('/admin');
  }
}
