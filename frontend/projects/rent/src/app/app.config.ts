import {
  type ApplicationConfig,
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
import { SESSION, type Session } from '@rent/api';
import { routes } from './app.routes';
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
    { provide: TitleStrategy, useClass: RentTitleStrategy },
    provideAppInitializer(() => inject(PageFocus).start()),
    { provide: SESSION, useValue: noSession },
  ],
};
