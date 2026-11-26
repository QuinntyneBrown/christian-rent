import type { Locator, Page } from '@playwright/test';

/** The confirmation before Remove (cr-confirm-remove-dialog, docs/mocks/dialogs/confirm-remove/). */
export class ConfirmRemoveDialogPart {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly icon: Locator;
  readonly close: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly keepIt: Locator;
  /** "Remove listing" or "Remove member", and "Try again" after a failure. */
  readonly confirm: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__description');
    this.icon = this.root.locator('.dialog__icon');
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
    this.alert = this.root.locator('.alert');
    this.alertTitle = this.alert.locator('.alert__title');
    this.alertText = this.alert.locator('.alert__text');
    this.keepIt = this.root.getByRole('button', { name: 'Keep it', exact: true });
    this.confirm = this.root.locator('.dialog__footer .btn--danger');
  }
}
