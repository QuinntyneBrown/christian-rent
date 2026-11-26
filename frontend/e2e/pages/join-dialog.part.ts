import type { Locator, Page } from '@playwright/test';

/** The join dialog, "Become a member" (cr-join-dialog, docs/mocks/dialogs/join/). */
export class JoinDialogPart {
  readonly root: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly name: Locator;
  readonly church: Locator;
  readonly churchHelp: Locator;
  readonly reloadChurches: Locator;
  readonly newChurchName: Locator;
  readonly newChurchCity: Locator;
  readonly newChurchNote: Locator;
  readonly declaration: Locator;
  readonly alert: Locator;
  readonly notNow: Locator;
  readonly submit: Locator;
  readonly errors: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__description');
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
    this.name = this.root.getByLabel('Your name');
    this.church = this.root.getByLabel('Your church');
    this.churchHelp = this.root.locator('#join-church-help');
    this.reloadChurches = this.root
      .getByRole('button', { name: 'Try again' })
      .and(this.root.locator('.field__action'));
    this.newChurchName = this.root.getByLabel('Church name');
    this.newChurchCity = this.root.getByLabel('City');
    this.newChurchNote = this.root.getByText(
      'An admin confirms a new church before it is shown as verified.',
    );
    this.declaration = this.root.getByRole('checkbox', { name: /I am a Christian/ });
    this.alert = this.root.getByRole('alert');
    this.notNow = this.root.getByRole('button', { name: 'Not now' });
    this.submit = this.root.locator('.dialog__footer button[type="submit"]');
    this.errors = this.root.locator('.field__error');
  }

  async fill(name: string, church: string): Promise<void> {
    await this.name.fill(name);
    await this.church.selectOption({ label: church });
    await this.declaration.check();
  }
}
