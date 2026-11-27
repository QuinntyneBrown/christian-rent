import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  HttpMemberSessionApi,
  HttpMembersApi,
  MEMBERS_API,
  SESSION,
  SESSION_API,
  apiErrorInterceptor,
} from '@rent/api';
import { routes } from './app.routes';
import {
  ApiSession,
  GlobalErrorHandler,
  PageFocus,
  ShellTitleStrategy,
  sessionExpiryInterceptor,
} from '@rent/shell';

/** `rent`'s composition root (ADR 0028): binds every token the whole application shares. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // The expiry interceptor sits first, so it sees the ApiError the other makes (ADR 0029).
    provideHttpClient(
      withFetch(),
      withInterceptors([sessionExpiryInterceptor, apiErrorInterceptor]),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ShellTitleStrategy,
    { provide: TitleStrategy, useExisting: ShellTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    // Who is signed in as a member (ADR 0017, ADR 0029), asked at start without holding up the
    // screen.
    { provide: MEMBERS_API, useClass: HttpMembersApi },
    { provide: SESSION_API, useClass: HttpMemberSessionApi },
    ApiSession,
    { provide: SESSION, useExisting: ApiSession },
    provideAppInitializer(() => {
      void inject(SESSION).refresh();
    }),
  ],
};
