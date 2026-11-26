import { Injectable, signal } from '@angular/core';

/**
 * Whether the generic error toast is showing. One flag, not a list: however many errors arrive,
 * one toast shows until it is dismissed, so nothing accumulates (AGENTS.md, Bound what grows).
 */
@Injectable({ providedIn: 'root' })
export class ClientErrors {
  private readonly shown = signal(false);
  readonly showing = this.shown.asReadonly();

  report(): void {
    this.shown.set(true);
  }

  dismiss(): void {
    this.shown.set(false);
  }
}
