import type { Locator, Page } from '@playwright/test';
import { SiteHeaderPart } from './site-header.part';

/** "Not found": an address that matches no screen. */
export class NotFoundPage {
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

  async open(address: string): Promise<void> {
    await this.page.goto(address);
  }
}
