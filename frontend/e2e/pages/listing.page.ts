import type { Locator, Page } from '@playwright/test';
import { GalleryPart } from './gallery.part';
import { PosterPart } from './poster.part';
import { SiteHeaderPart } from './site-header.part';

/** Listing: one listing, its photos, who posted it, and the message box beside it. */
export class ListingPage {
  readonly header: SiteHeaderPart;
  readonly main: Locator;
  readonly allListings: Locator;
  readonly heading: Locator;
  readonly listing: Locator;
  readonly tag: Locator;
  /** The area, "when" for a listing for rent, and "Posted 2 days ago". */
  readonly facts: Locator;
  readonly note: Locator;
  readonly gallery: GalleryPart;
  readonly wantedPanel: Locator;
  readonly wantedWhen: Locator;
  readonly poster: PosterPart;
  readonly aside: Locator;
  readonly messageBox: Locator;
  readonly messageBoxHeading: Locator;
  readonly eyebrow: Locator;
  readonly price: Locator;
  /** The listing's skeleton, while it loads. */
  readonly skeleton: Locator;
  readonly messageBoxSkeleton: Locator;
  readonly status: Locator;
  readonly plainPage: Locator;
  readonly plainText: Locator;
  readonly tryAgain: Locator;
  readonly browseAllListings: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    this.main = page.locator('main#main');
    this.allListings = this.main
      .locator('.listing-toolbar')
      .getByRole('link', { name: 'All listings', exact: true });
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.listing = this.main.locator('article.listing');
    this.tag = this.listing.locator('.tag');
    this.facts = this.listing.locator('ul.listing__facts > li');
    this.note = this.listing.locator('.listing__note');
    this.gallery = new GalleryPart(this.listing.locator('section.gallery'));
    this.wantedPanel = this.listing.locator('.wanted-panel');
    this.wantedWhen = this.wantedPanel.locator('.wanted-panel__when');
    this.poster = new PosterPart(this.listing.getByRole('region', { name: 'Posted by' }));
    this.aside = this.main.locator('.listing-layout__aside');
    this.messageBox = this.aside.locator('.message-box');
    this.messageBoxHeading = this.messageBox.getByRole('heading', { level: 2 });
    this.eyebrow = this.messageBox.locator('.message-box__eyebrow');
    this.price = this.messageBox.locator('.message-box__price');
    this.skeleton = this.main.locator('.listing--loading');
    this.messageBoxSkeleton = this.aside.locator('.message-box[aria-hidden="true"]');
    this.status = this.main.locator('p.visually-hidden[role="status"]');
    const plain = this.main.locator('.plain-page');
    this.plainPage = plain;
    this.plainText = plain.locator('.plain-page__text');
    this.tryAgain = plain.getByRole('button', { name: 'Try again' });
    this.browseAllListings = plain.getByRole('link', { name: 'Browse all listings' });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/listings/${id}`);
  }

  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
