import { Injectable, inject, signal } from '@angular/core';
import { SESSION, isApiError } from '@rent/api';
import { type SignInErrors, validateSignIn } from '@rent/domain';

/** Where the sign-in form is (L2-037). */
export type SignInStatus = 'idle' | 'submitting' | 'refused' | 'limited' | 'error';

/**
 * The sign-in form of either application (L2-037, L2-038; sign-in-and-sessions design): what is
 * typed, which empty field is marked, and how the last attempt ended. One refusal for every
 * failure keeps the email and clears the password (criterion 2); too many attempts say when
 * the next is allowed (criterion 4); a backend that cannot be reached loses nothing typed but the
 * password (criterion 9). The page that provides it navigates when `submit` answers true.
 */
@Injectable()
export class SignInStore {
  private readonly session = inject(SESSION);

  readonly email = signal('');
  readonly password = signal('');
  readonly errors = signal<SignInErrors>({});
  readonly status = signal<SignInStatus>('idle');
  /** When signing in from this device is allowed again, of a `limited` refusal. */
  readonly retryAt = signal<string | null>(null);
  /** The field that should have focus after the last attempt, and a count that changes with each. */
  readonly focus = signal<{ field: 'email' | 'password'; attempt: number } | null>(null);
  private attempts = 0;

  /** Signs in; true once signed in. A second call while one is in flight does nothing. */
  async submit(): Promise<boolean> {
    if (this.status() === 'submitting') {
      return false;
    }
    const form = { email: this.email().trim(), password: this.password() };
    const errors = validateSignIn(form);
    this.errors.set(errors);
    if (errors.email || errors.password) {
      this.status.set('idle');
      this.focusOn(errors.email ? 'email' : 'password');
      return false;
    }
    this.status.set('submitting');
    try {
      await this.session.signIn(form);
      this.status.set('idle');
      return true;
    } catch (error) {
      this.password.set('');
      if (isApiError(error) && error.code === 'sign_in_failed') {
        this.status.set('refused');
        this.focusOn('password');
      } else if (isApiError(error) && error.status === 429) {
        this.status.set('limited');
        this.retryAt.set(error.retryAt);
      } else {
        this.status.set('error');
      }
      return false;
    }
  }

  private focusOn(field: 'email' | 'password'): void {
    this.focus.set({ field, attempt: ++this.attempts });
  }
}
