import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { HttpMembersApi, MEMBERS_API, SESSION, SITE_LINKS, apiErrorInterceptor } from '@rent/api';
import { ApiSession, GlobalErrorHandler, PageFocus, ShellTitleStrategy } from '@rent/shell';
import { routes } from './app.routes';
import { ConfigSiteLinks } from './site/config-site-links';

/** Admin's composition root (ADR 0028): binds every token the whole application shares. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ShellTitleStrategy,
    { provide: TitleStrategy, useExisting: ShellTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    { provide: MEMBERS_API, useClass: HttpMembersApi },
    ApiSession,
    { provide: SESSION, useExisting: ApiSession },
    // The site's address, from the deployment's config.json, before the first screen.
    ConfigSiteLinks,
    { provide: SITE_LINKS, useExisting: ConfigSiteLinks },
    provideAppInitializer(() => inject(ConfigSiteLinks).load()),
  ],
};
