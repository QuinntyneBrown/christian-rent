import type { Locator } from '@playwright/test';

/** One card on Browse (cr-listing-card), for rent or wanted. */
export class ListingCardPart {
  readonly link: Locator;
  /** The listing's title: under the photo for rent, on the blue panel when wanted. */
  readonly title: Locator;
  readonly photo: Locator;
  readonly noPhoto: Locator;
  readonly tag: Locator;
  readonly when: Locator;
  /** The poster's name, on a wanted card. */
  readonly poster: Locator;
  readonly price: Locator;
  readonly place: Locator;
  readonly church: Locator;

  constructor(readonly root: Locator) {
    this.link = root;
    this.title = root.getByRole('heading', { level: 2 });
    this.photo = root.locator('img.listing-card__photo');
    this.noPhoto = root.locator('.listing-card__no-photo');
    this.tag = root.locator('.tag');
    this.when = root.locator('.listing-card__when');
    this.poster = root.locator('p.listing-card__title');
    this.price = root.locator('.listing-card__price');
    this.place = root.locator('.listing-card__place');
    this.church = root.locator('.listing-card__church');
  }
}
