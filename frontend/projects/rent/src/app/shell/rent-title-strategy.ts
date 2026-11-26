import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { screenPath } from './screen-path';

export const SITE_NAME = 'christian.rent';

/**
 * Sets the document title per route, ending in "christian.rent", and announces it after a
 * navigation to another screen, so a screen reader hears that the screen changed (L2-032,
 * criterion 4). A change of the query alone is not announced; the screen says what changed.
 * A screen whose title is known only once it has loaded, such as a listing's, sets it with
 * `setPageTitle`.
 */
@Injectable()
export class RentTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly announcer = inject(LiveAnnouncer);
  private path: string | null = null;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const title = this.compose(pageTitle);
    this.title.setTitle(title);
    const path = screenPath(snapshot.url);
    if (this.path !== null && path !== this.path) {
      void this.announcer.announce(title, 'polite');
    }
    this.path = path;
  }

  /** Replaces the current page's title, as text, after it has loaded; it is not announced again. */
  setPageTitle(pageTitle: string): void {
    this.title.setTitle(this.compose(pageTitle));
  }

  private compose(pageTitle: string | undefined): string {
    return pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
  }
}
