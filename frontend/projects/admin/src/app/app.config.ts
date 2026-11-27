import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  HttpAdminSessionApi,
  SESSION,
  SESSION_API,
  SITE_LINKS,
  apiErrorInterceptor,
} from '@rent/api';
import {
  ApiSession,
  GlobalErrorHandler,
  PageFocus,
  ShellTitleStrategy,
  sessionExpiryInterceptor,
} from '@rent/shell';
import { routes } from './app.routes';
import { ConfigSiteLinks } from './site/config-site-links';

/** Admin's composition root (ADR 0028): binds every token the whole application shares. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // The expiry interceptor sits first, so it sees the ApiError the other makes (ADR 0029).
    provideHttpClient(
      withFetch(),
      withInterceptors([sessionExpiryInterceptor, apiErrorInterceptor]),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ShellTitleStrategy,
    { provide: TitleStrategy, useExisting: ShellTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    // Who is signed in to Admin, through Admin's own session (ADR 0029).
    { provide: SESSION_API, useClass: HttpAdminSessionApi },
    ApiSession,
    { provide: SESSION, useExisting: ApiSession },
    // The site's address, from the deployment's config.json, before the first screen.
    ConfigSiteLinks,
    { provide: SITE_LINKS, useExisting: ConfigSiteLinks },
    provideAppInitializer(() => inject(ConfigSiteLinks).load()),
  ],
};
