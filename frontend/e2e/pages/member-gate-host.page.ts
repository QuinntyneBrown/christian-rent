import type { Locator, Page } from '@playwright/test';
import { SiteHeaderPart } from './site-header.part';

/**
 * The host page that only the `e2e` build has (ADR 0018): three buttons that call `MemberGate`
 * for posting, messaging and reporting, and what it answered.
 */
export class MemberGateHostPage {
  readonly header: SiteHeaderPart;
  readonly heading: Locator;
  readonly post: Locator;
  readonly message: Locator;
  readonly report: Locator;
  readonly draft: Locator;
  readonly answer: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    const main = page.locator('main#main');
    this.heading = main.getByRole('heading', { level: 1 });
    this.post = main.getByRole('button', { name: 'Post', exact: true });
    this.message = main.getByRole('button', { name: 'Send a message' });
    this.report = main.getByRole('button', { name: 'Report' });
    this.draft = main.getByLabel('Draft');
    this.answer = main.getByRole('status');
  }

  async open(): Promise<void> {
    await this.page.goto('/dev/member-gate');
    await this.heading.waitFor();
  }
}
