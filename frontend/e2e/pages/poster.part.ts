import type { Locator } from '@playwright/test';

/** Who posted a listing (cr-poster), with their church and the verified marks. */
export class PosterPart {
  readonly avatar: Locator;
  readonly name: Locator;
  readonly church: Locator;
  readonly memberVerified: Locator;
  readonly churchVerified: Locator;
  readonly since: Locator;

  constructor(readonly root: Locator) {
    this.avatar = root.locator('.avatar');
    this.name = root.locator('.poster__name');
    this.church = root.locator('.poster__church');
    this.memberVerified = root.locator('.poster__line:has(.poster__name) .verified');
    this.churchVerified = root.locator('.poster__line:has(.poster__church) .verified');
    this.since = root.locator('.poster__since');
  }
}
