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
import { HttpMembersApi, MEMBERS_API, SESSION, apiErrorInterceptor } from '@rent/api';
import { routes } from './app.routes';
import { AppSession } from './members/app-session';
import { GlobalErrorHandler } from './shell/global-error-handler';
import { PageFocus } from './shell/page-focus';
import { RentTitleStrategy } from './shell/rent-title-strategy';

/** The composition root: binds every token the whole app shares. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    RentTitleStrategy,
    { provide: TitleStrategy, useExisting: RentTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    // Who is signed in as a member (ADR 0017), asked at start without holding up the screen.
    { provide: MEMBERS_API, useClass: HttpMembersApi },
    AppSession,
    { provide: SESSION, useExisting: AppSession },
    provideAppInitializer(() => {
      void inject(SESSION).refresh();
    }),
  ],
};
