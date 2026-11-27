import type { Locator, Page } from '@playwright/test';
import { SiteHeaderPart } from './site-header.part';

/** The sign-in page of either application (cr-sign-in). */
export class SignInPage {
  readonly header: SiteHeaderPart;
  readonly overline: Locator;
  readonly heading: Locator;
  readonly text: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly submit: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly note: Locator;
  readonly backToBrowse: Locator;
  readonly goToSite: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    const form = page.locator('.sign-in');
    this.overline = form.locator('.sign-in__overline');
    this.heading = form.getByRole('heading', { level: 1 });
    this.text = form.locator('.sign-in__text');
    this.email = form.getByLabel('Email', { exact: true });
    this.password = form.getByLabel('Password', { exact: true });
    this.emailError = form.locator('#sign-in-email-error');
    this.passwordError = form.locator('#sign-in-password-error');
    this.submit = form.getByRole('button', { name: 'Sign in' });
    this.alert = form.locator('.alert');
    this.alertTitle = form.locator('.alert__title');
    this.alertText = form.locator('.alert__text');
    this.note = form.locator('.sign-in__note');
    this.backToBrowse = form.getByRole('link', { name: 'Back to Browse' });
    this.goToSite = form.getByRole('link', { name: 'Go to christian.rent' });
  }

  /** Opens the page with its query, such as `return=/post`. */
  async open(query = ''): Promise<void> {
    await this.page.goto(`/sign-in${query ? `?${query}` : ''}`);
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
