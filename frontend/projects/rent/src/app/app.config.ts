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
import { ApiSession, GlobalErrorHandler, PageFocus, ShellTitleStrategy } from '@rent/shell';

/** `rent`'s composition root (ADR 0028): binds every token the whole application shares. */
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
    ShellTitleStrategy,
    { provide: TitleStrategy, useExisting: ShellTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    // Who is signed in as a member (ADR 0017), asked at start without holding up the screen.
    { provide: MEMBERS_API, useClass: HttpMembersApi },
    ApiSession,
    { provide: SESSION, useExisting: ApiSession },
    provideAppInitializer(() => {
      void inject(SESSION).refresh();
    }),
  ],
};
