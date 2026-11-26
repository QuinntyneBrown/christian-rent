import type { Locator, Page } from '@playwright/test';

/** The report dialog (cr-report-listing-dialog, docs/mocks/dialogs/report-listing/). */
export class ReportDialogPart {
  readonly root: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly icon: Locator;
  readonly close: Locator;
  /** The group of reasons, named by its question. */
  readonly reasons: Locator;
  readonly options: Locator;
  readonly radios: Locator;
  readonly reasonError: Locator;
  readonly note: Locator;
  readonly counter: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly cancel: Locator;
  readonly submit: Locator;
  /** "Done", after a report is sent. */
  readonly done: Locator;
  /** "OK, close", for a listing reported before. */
  readonly ok: Locator;
  /** What a screen reader is told when the form is replaced. */
  readonly status: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__description');
    this.icon = this.root.locator('.dialog__icon');
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
    this.reasons = this.root.getByRole('group', {
      name: 'Why are you reporting it? Required',
      exact: true,
    });
    this.options = this.reasons.locator('.choice');
    this.radios = this.root.getByRole('radio');
    this.reasonError = this.reasons.locator('.field__error');
    this.note = this.root.getByRole('textbox', { name: 'Note (optional)', exact: true });
    this.counter = this.root.locator('.field__counter');
    this.alert = this.root.locator('.alert');
    this.alertTitle = this.alert.locator('.alert__title');
    this.alertText = this.alert.locator('.alert__text');
    this.cancel = this.root.getByRole('button', { name: 'Cancel', exact: true });
    this.submit = this.root.locator('.dialog__footer button[type="submit"]');
    this.done = this.root.getByRole('button', { name: 'Done', exact: true });
    this.ok = this.root.getByRole('button', { name: 'OK, close', exact: true });
    this.status = this.root.locator('p.visually-hidden[role="status"]');
  }

  reason(name: string): Locator {
    return this.reasons.getByRole('radio', { name, exact: true });
  }

  /** True while the keyboard's focus is inside the dialog. */
  async holdsFocus(): Promise<boolean> {
    return this.root.evaluate((dialog) => dialog.contains(document.activeElement));
  }

  /** The heights of the controls a finger presses, in CSS pixels. */
  async targetHeights(): Promise<number[]> {
    return this.root
      .locator('.choice, button')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  }
}
