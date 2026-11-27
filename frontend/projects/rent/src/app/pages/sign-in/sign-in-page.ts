import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import { Button, SignIn } from '@rent/components';
import { formatRetryAt, safeReturn } from '@rent/domain';
import { SignInStore } from '@rent/shell';
import { RentHeader } from '../../shell/rent-header';

/**
 * `rent`'s sign-in page (L2-037; sign-in-and-sessions design): the form, then back to `return`
 * when it is a path within `rent` (criteria 5 and 6), or Browse. Someone already signed in goes
 * there at once (criterion 11). `expired` says the session ended (L2-040, criterion 2). The page
 * provides its store, which goes with it.
 */
@Component({
  selector: 'cr-sign-in-page',
  imports: [Button, RentHeader, RouterLink, SignIn],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SignInStore],
})
export class SignInPage {
  readonly expired = input<string | undefined>(undefined);
  /** The address to come back to, from the query's `return`. */
  private readonly returnTo = inject(ActivatedRoute).snapshot.queryParamMap.get('return');

  protected readonly store = inject(SignInStore);
  private readonly session = inject(SESSION);
  private readonly router = inject(Router);
  protected readonly retryAt = computed(() =>
    this.store.status() === 'limited' ? formatRetryAt(this.store.retryAt(), new Date()) : null,
  );

  constructor() {
    effect(() => {
      if (this.session.state() === 'signed-in' && this.store.status() !== 'submitting') {
        untracked(() => this.goBack());
      }
    });
  }

  protected async submit(): Promise<void> {
    if (await this.store.submit()) {
      this.goBack();
    }
  }

  private goBack(): void {
    void this.router.navigateByUrl(safeReturn(this.returnTo));
  }
}
