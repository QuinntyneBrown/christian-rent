import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  signal,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { SESSION, type Session, apiErrorInterceptor } from '@rent/api';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './shell/global-error-handler';
import { PageFocus } from './shell/page-focus';
import { RentTitleStrategy } from './shell/rent-title-strategy';

/** Nobody is signed in until sign-in is designed (ADR 0005). */
const noSession: Session = { member: signal(null).asReadonly() };

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
    { provide: TitleStrategy, useClass: RentTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    { provide: SESSION, useValue: noSession },
  ],
};
