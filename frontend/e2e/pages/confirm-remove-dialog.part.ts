import type { Locator, Page } from '@playwright/test';

/** The confirmation of Remove (cr-confirm-remove-dialog, docs/mocks/dialogs/confirm-remove/). */
export class ConfirmRemoveDialogPart {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly dangerIcon: Locator;
  readonly close: Locator;
  readonly keepIt: Locator;
  /** "Remove listing", "Remove member", or "Try again" after a failure. */
  readonly confirm: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__description');
    this.dangerIcon = this.root.locator('.dialog__icon--danger');
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
    this.keepIt = this.root.getByRole('button', { name: 'Keep it', exact: true });
    this.confirm = this.root.locator('.dialog__footer .btn--danger');
    this.alert = this.root.getByRole('alert');
    this.alertTitle = this.alert.locator('.alert__title');
    this.alertText = this.alert.locator('.alert__text');
  }

  /** True while the keyboard's focus is inside the dialog. */
  async holdsFocus(): Promise<boolean> {
    return this.root.evaluate((dialog) => dialog.contains(document.activeElement));
  }
}
