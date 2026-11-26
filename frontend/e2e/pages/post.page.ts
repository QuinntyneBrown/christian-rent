import type { FileChooser, Locator, Page } from '@playwright/test';

/** A file to choose: a path, or a name, a type and its bytes. */
type ChosenFile = Parameters<FileChooser['setFiles']>[0];
import { SiteHeaderPart } from './site-header.part';

/**
 * Post (docs/mocks/pages/post/): the sentence, the fields, the live preview beside them, and the
 * confirmation that replaces them once the listing is sent.
 */
export class PostPage {
  readonly header: SiteHeaderPart;
  readonly main: Locator;
  readonly heading: Locator;
  readonly sentence: Locator;
  readonly side: Locator;
  readonly have: Locator;
  readonly need: Locator;
  readonly kind: Locator;
  readonly space: Locator;
  readonly thing: Locator;
  readonly form: Locator;
  readonly title: Locator;
  readonly price: Locator;
  readonly pricePrefix: Locator;
  readonly pricePer: Locator;
  readonly when: Locator;
  readonly giveDates: Locator;
  readonly dates: Locator;
  readonly from: Locator;
  readonly to: Locator;
  readonly datesSummary: Locator;
  readonly describeInWords: Locator;
  readonly area: Locator;
  readonly areaHelp: Locator;
  readonly photos: Locator;
  readonly addPhoto: Locator;
  readonly photosLabel: Locator;
  readonly photoItems: Locator;
  readonly photoImages: Locator;
  readonly onTheCard: Locator;
  readonly photosHelp: Locator;
  readonly photosError: Locator;
  readonly note: Locator;
  readonly noteCounter: Locator;
  /** The visible labels of the fields, in order. */
  readonly labels: Locator;
  readonly submit: Locator;
  readonly fine: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly errors: Locator;
  readonly alert: Locator;
  readonly aside: Locator;
  readonly previewHeading: Locator;
  readonly preview: Locator;
  readonly previewTitle: Locator;
  readonly previewAsk: Locator;
  readonly previewWhen: Locator;
  readonly previewTag: Locator;
  readonly previewPrice: Locator;
  readonly previewPlace: Locator;
  readonly previewChurch: Locator;
  readonly previewPhoto: Locator;
  readonly previewImage: Locator;
  readonly confirmation: Locator;
  readonly confirmationText: Locator;
  readonly confirmationCard: Locator;
  readonly backToBrowsing: Locator;
  readonly postAnother: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    this.main = page.locator('main#main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.sentence = this.main.locator('h1.sentence');
    this.side = this.main.getByRole('radiogroup', { name: 'Do you have it or need it?' });
    this.have = this.side.getByRole('radio', { name: 'have', exact: true });
    this.need = this.side.getByRole('radio', { name: 'need', exact: true });
    this.kind = this.main.getByRole('radiogroup', { name: 'A space or a thing?' });
    this.space = this.kind.getByRole('radio', { name: 'a space', exact: true });
    this.thing = this.kind.getByRole('radio', { name: 'a thing', exact: true });
    this.form = this.main.locator('form.post-form');
    this.title = this.form.locator('#post-title');
    this.price = this.form.locator('#post-price');
    this.pricePrefix = this.form.locator('.line-field__prefix');
    this.pricePer = this.form.getByLabel('Per', { exact: true });
    this.when = this.form.locator('#post-when');
    this.giveDates = this.form.getByRole('button', { name: 'Give dates instead' });
    this.dates = this.form.getByRole('group', { name: 'When' });
    this.from = this.form.getByLabel('From', { exact: true });
    this.to = this.form.getByLabel('To', { exact: true });
    this.datesSummary = this.form.locator('.date-range__summary');
    this.describeInWords = this.form.getByRole('button', { name: 'Describe it in words instead' });
    this.area = this.form.locator('#post-area');
    this.areaHelp = this.form.locator('#post-area-help');
    this.photos = this.form.getByRole('group', { name: /^Photos/ });
    this.addPhoto = this.photos.getByRole('button', { name: 'Add', exact: true });
    this.photosLabel = this.photos.locator('.line-field__label');
    this.photoItems = this.photos.locator('.photo-picker__item');
    this.photoImages = this.photoItems.locator('img');
    this.onTheCard = this.photos.locator('.photo-picker__first');
    this.photosHelp = this.photos.locator('.field__help');
    this.photosError = this.photos.locator('.field__error');
    this.note = this.form.locator('#post-note');
    this.noteCounter = this.form.locator('.field__counter');
    this.labels = this.form.locator('.line-field__label, .field__label');
    this.submit = this.form.locator('.post-actions button[type="submit"]');
    this.fine = this.form.locator('.post-actions__fine');
    this.summary = this.main.locator('.form-summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.errors = this.form.locator('.field__error');
    this.alert = this.main.locator('.alert:not(.form-summary)');
    this.aside = this.main.getByRole('complementary', { name: 'How it’ll look' });
    this.previewHeading = this.aside.getByRole('heading', { level: 2 });
    this.preview = this.aside.locator('.listing-card');
    this.previewTitle = this.preview.locator('.listing-card__title');
    this.previewAsk = this.preview.locator('.listing-card__ask');
    this.previewWhen = this.preview.locator('.listing-card__when');
    this.previewTag = this.preview.locator('.tag');
    this.previewPrice = this.preview.locator('.listing-card__price');
    this.previewPlace = this.preview.locator('.listing-card__place');
    this.previewChurch = this.preview.locator('.listing-card__church');
    this.previewPhoto = this.preview.locator('.listing-card__no-photo');
    this.previewImage = this.preview.locator('img.listing-card__photo');
    this.confirmation = this.main.locator('section.confirmation');
    this.confirmationText = this.confirmation.locator('.confirmation__text');
    this.confirmationCard = this.confirmation.locator('.listing-card');
    this.backToBrowsing = this.confirmation.getByRole('link', { name: 'Back to browsing' });
    this.postAnother = this.confirmation.getByRole('button', { name: 'Post another' });
  }

  /** The status of photo `n` while it uploads, named "Uploading photo {n}". */
  uploading(n: number): Locator {
    return this.photos.getByRole('status', { name: `Uploading photo ${n}`, exact: true });
  }

  /** The button that removes photo `n`. */
  removePhoto(n: number): Locator {
    return this.photos.getByRole('button', { name: `Remove photo ${n}`, exact: true });
  }

  /** The button that cancels the upload of photo `n`. */
  cancelUpload(n: number): Locator {
    return this.photos.getByRole('button', { name: `Cancel upload of photo ${n}`, exact: true });
  }

  /** Chooses a file through the Add tile's file chooser, as a person does. */
  async choosePhoto(file: ChosenFile): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.addPhoto.click();
    await (await chooser).setFiles(file);
  }

  /** Opens Post, with the query Browse sets when given. */
  async open(query = ''): Promise<void> {
    await this.page.goto(`/post${query}`);
  }

  /** Fills a listing for rent as the default mock draws it. */
  async fillForRent(): Promise<void> {
    await this.title.fill('Pressure washer and drill kit');
    await this.price.fill('25');
    await this.when.fill('Most weekends');
    await this.area.fill('Willoughby, Langley');
    await this.note.fill('Pick up from my garage. Happy to show you how it works.');
  }

  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
