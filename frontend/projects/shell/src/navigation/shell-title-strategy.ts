import { Injectable, Injector, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { screenPath } from './screen-path';

export const SITE_NAME = 'christian.rent';

/**
 * Sets the document title per route, ending in "christian.rent", and announces it after a
 * navigation to another screen, so a screen reader hears that the screen changed (L2-032,
 * criterion 4). A change of the query alone is not announced; the screen says what changed.
 * A screen whose title is known only once it has loaded, such as a listing's, sets it with
 * `setPageTitle`. The CDK's `LiveAnnouncer` is imported only when the first announcement is
 * made: a static import would keep the CDK's accessibility code, which the join dialog makes
 * live, in the initial bundle (ADR 0020).
 */
@Injectable()
export class ShellTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly injector = inject(Injector);
  private path: string | null = null;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const title = this.compose(pageTitle);
    this.title.setTitle(title);
    const path = screenPath(snapshot.url);
    if (this.path !== null && path !== this.path) {
      void this.announce(title);
    }
    this.path = path;
  }

  /** Replaces the current page's title, as text, after it has loaded; it is not announced again. */
  setPageTitle(pageTitle: string): void {
    this.title.setTitle(this.compose(pageTitle));
  }

  private async announce(title: string): Promise<void> {
    const { LiveAnnouncer } = await import('@angular/cdk/a11y');
    await this.injector.get(LiveAnnouncer).announce(title, 'polite');
  }

  private compose(pageTitle: string | undefined): string {
    return pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
  }
}
