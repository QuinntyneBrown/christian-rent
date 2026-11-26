import type { Locator, Page } from '@playwright/test';

/** The toast the app shows for an unexpected error in the browser. */
export class ErrorToastPart {
  readonly region: Locator;
  readonly toast: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly reload: Locator;
  readonly dismiss: Locator;

  constructor(private readonly page: Page) {
    this.region = page.locator('.toast-region');
    this.toast = this.region.locator('.toast--danger');
    this.title = this.toast.locator('.toast__title');
    this.text = this.toast.locator('.toast__text');
    this.reload = this.toast.getByRole('button', { name: 'Reload' });
    this.dismiss = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  /** Raises an error no code catches, as a bug in the app would. */
  async raiseUnexpectedError(message: string): Promise<void> {
    await this.page.evaluate((text) => {
      setTimeout(() => {
        throw new Error(text);
      });
    }, message);
  }
}
