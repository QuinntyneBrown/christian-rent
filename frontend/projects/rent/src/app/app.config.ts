import { type ApplicationConfig, provideBrowserGlobalErrorListeners, signal } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { SESSION, type Session } from '@rent/api';
import { routes } from './app.routes';

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
    { provide: SESSION, useValue: noSession },
  ],
};
