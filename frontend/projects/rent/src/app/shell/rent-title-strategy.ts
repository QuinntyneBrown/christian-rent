import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_NAME = 'christian.rent';

/**
 * Sets the document title per route, ending in "christian.rent", and announces it after a
 * navigation, so a screen reader hears that the screen changed (L2-032, criterion 4).
 */
@Injectable()
export class RentTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly announcer = inject(LiveAnnouncer);
  private navigated = false;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const title = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
    this.title.setTitle(title);
    if (this.navigated) {
      void this.announcer.announce(title, 'polite');
    }
    this.navigated = true;
  }
}
