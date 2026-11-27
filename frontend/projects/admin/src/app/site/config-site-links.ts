import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { type SiteLinks } from '@rent/api';
import { parseSiteUrl } from '@rent/domain';
import { firstValueFrom } from 'rxjs';

/**
 * `SITE_LINKS` from `/config.json`, which the deployment writes beside Admin's files (ADR 0028),
 * so the site's address changes without a rebuild. It is read once, before the first screen; a
 * missing file or an address that is not a plain origin leaves the links to the site out.
 */
@Injectable()
export class ConfigSiteLinks implements SiteLinks {
  private readonly http = inject(HttpClient);
  private readonly url = signal<string | null>(null);

  readonly siteUrl = this.url.asReadonly();

  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<{ siteUrl?: unknown }>('/config.json'));
      this.url.set(parseSiteUrl(config?.siteUrl));
    } catch {
      this.url.set(null);
    }
  }
}
