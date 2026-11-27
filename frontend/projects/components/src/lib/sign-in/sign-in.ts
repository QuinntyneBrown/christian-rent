import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { TextField } from '../text-field/text-field';

/** How the last attempt ended, as the form shows it (L2-037). */
export type SignInFormStatus = 'idle' | 'submitting' | 'refused' | 'limited' | 'error';

/**
 * The sign-in form of either application (docs/design-system/components/sign-in.html; L2-037,
 * L2-038): the heading, an email and a password with their labels, Sign in, the message of the
 * last attempt, who creates accounts, and the way out the consumer projects
 * (`slot="links"`). Its fields are `type="email"` with `autocomplete="username"` and
 * `type="password"` with `autocomplete="current-password"`, so password managers fill them and
 * paste works (WCAG 2.2, 3.3.8). It takes the state and emits what the person does.
 */
@Component({
  selector: 'cr-sign-in',
  imports: [Alert, Button, TextField],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  /** Admin's own form, inside the Admin gate. */
  readonly admin = input(false);
  readonly email = model('');
  readonly password = model('');
  readonly errors = input<{ readonly email?: string; readonly password?: string }>({});
  readonly status = input<SignInFormStatus>('idle');
  /** When signing in is allowed again, in words ("today at 3:15 p.m."), of a limited attempt. */
  readonly retryAt = input<string | null>(null);
  /** The person arrived because their session ended (L2-040, criterion 2). */
  readonly expired = input(false);
  /** The field to move focus to, with a count that changes with each attempt. */
  readonly focusOn = input<{
    readonly field: 'email' | 'password';
    readonly attempt: number;
  } | null>(null);
  readonly submitted = output<void>();

  protected readonly busy = computed(() => this.status() === 'submitting');
  protected readonly limitedText = computed(() => {
    const when = this.retryAt() ?? 'later';
    return `You can try again ${when}${when.endsWith('.') ? '' : '.'}`;
  });
  private readonly emailField = viewChild.required<TextField>('emailField');
  private readonly passwordField = viewChild.required<TextField>('passwordField');
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const target = this.focusOn();
      if (target) {
        untracked(() =>
          afterNextRender(
            () => (target.field === 'email' ? this.emailField() : this.passwordField()).focus(),
            { injector: this.injector },
          ),
        );
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
