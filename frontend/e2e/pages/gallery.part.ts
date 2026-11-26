import type { Locator } from '@playwright/test';

/** A listing's photos (cr-gallery): one large, the rest as thumbnails. */
export class GalleryPart {
  readonly photo: Locator;
  readonly noPhoto: Locator;
  readonly thumbs: Locator;
  /** "Photo 1 of 3", a polite live region. */
  readonly count: Locator;

  constructor(readonly root: Locator) {
    this.photo = root.locator('.gallery__main img');
    this.noPhoto = root.locator('.gallery__no-photo');
    this.thumbs = root.locator('button.gallery__thumb');
    this.count = root.locator('.gallery__count');
  }

  /** The thumbnail named by its position, "Photo 2 of 3". */
  thumb(position: number, count: number): Locator {
    return this.root.getByRole('button', { name: `Photo ${position} of ${count}`, exact: true });
  }
}
