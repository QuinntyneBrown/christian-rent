import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ClientErrors } from './client-errors';

/**
 * Handles an error nothing else caught (L2-033, criterion 7): it logs it to the browser console,
 * as Angular's own handler does, and shows the generic toast. It sends nothing to a third party.
 */
@Injectable()
export class GlobalErrorHandler extends ErrorHandler {
  private readonly clientErrors = inject(ClientErrors);

  override handleError(error: unknown): void {
    super.handleError(error);
    this.clientErrors.report();
  }
}
