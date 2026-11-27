import { InjectionToken, type Signal } from '@angular/core';

/**
 * Where Admin's links to the public site lead ("Back to site", "View on site", "Go to
 * christian.rent"): the site's origin, set when Admin is deployed, or null when none is set or it
 * is not a valid origin (ADR 0028). Admin binds it; `rent` needs none.
 */
export interface SiteLinks {
  readonly siteUrl: Signal<string | null>;
}

export const SITE_LINKS = new InjectionToken<SiteLinks>('SITE_LINKS');
