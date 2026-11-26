import type { Locator } from '@playwright/test';

/**
 * The message box beside a listing (docs/mocks/pages/listing/): its price, the dates of a
 * listing for rent, the message, and the confirmation that replaces the form once it is sent.
 */
export class MessageBoxPart {
  readonly heading: Locator;
  readonly eyebrow: Locator;
  readonly price: Locator;
  readonly form: Locator;
  readonly dates: Locator;
  readonly from: Locator;
  readonly to: Locator;
  readonly datesSummary: Locator;
  readonly datesError: Locator;
  readonly text: Locator;
  readonly counter: Locator;
  readonly textError: Locator;
  readonly submit: Locator;
  readonly fine: Locator;
  /** The failed or limited alert; the summary is `summary`. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly summary: Locator;
  readonly summaryTitle: Locator;
  readonly summaryLinks: Locator;
  readonly sent: Locator;
  readonly sentTitle: Locator;
  readonly sentText: Locator;
  readonly quote: Locator;
  readonly backToAllListings: Locator;
  /** "This is your listing.", on the member's own listing. */
  readonly ownTitle: Locator;
  readonly ownText: Locator;

  constructor(readonly root: Locator) {
    this.heading = root.getByRole('heading', { level: 2 });
    this.eyebrow = root.locator('.message-box__eyebrow');
    this.price = root.locator('.message-box__price');
    this.form = root.locator('form.message-box__form');
    this.dates = this.form.getByRole('group', { name: 'Dates', exact: true });
    this.from = this.form.getByLabel('From', { exact: true });
    this.to = this.form.getByLabel('To', { exact: true });
    this.datesSummary = this.form.locator('.date-range__summary');
    this.datesError = this.dates.locator('.field__error');
    this.text = this.form.getByLabel('Message', { exact: true });
    this.counter = this.form.locator('.field__counter');
    this.textError = this.form.locator('.textarea ~ .field__error');
    this.submit = this.form.locator('button[type="submit"]');
    this.fine = this.form.locator('.message-box__fine');
    this.alert = this.form.locator('.alert:not(.form-summary)');
    this.alertTitle = this.alert.locator('.alert__title');
    this.alertText = this.alert.locator('.alert__text');
    this.summary = this.form.locator('.alert.form-summary');
    this.summaryTitle = this.summary.locator('.alert__title');
    this.summaryLinks = this.summary.getByRole('link');
    this.sent = root.locator('.message-box__sent');
    this.sentTitle = this.sent.locator('.message-box__sent-title');
    this.sentText = this.sent.locator('.message-box__sent-text');
    this.quote = this.sent.locator('.message-box__quote');
    this.backToAllListings = this.sent.getByRole('link', { name: 'Back to all listings' });
    this.ownTitle = root.locator(':scope > .message-box__sent-title');
    this.ownText = root.locator(':scope > .message-box__sent-text');
  }
}
