import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SESSION, SITE_LINKS } from '@rent/api';
import { AdminGate, Button, SignIn } from '@rent/components';
import { formatRetryAt, safeReturn } from '@rent/domain';
import { SignInStore } from '@rent/shell';

/**
 * Admin's own sign-in page (L2-038; sign-in-and-sessions design), on the Admin gate: the form,
 * then back to `return` when it is a path within Admin, or the review queue. Someone already
 * signed in to Admin goes there at once. It downloads none of the review queue. The page
 * provides its store, which goes with it.
 */
@Component({
  selector: 'cr-admin-sign-in-page',
  imports: [AdminGate, Button, SignIn],
  templateUrl: './admin-sign-in-page.html',
  styleUrl: './admin-sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SignInStore],
})
export class AdminSignInPage {
  readonly expired = input<string | undefined>(undefined);

  protected readonly store = inject(SignInStore);
  protected readonly siteUrl = inject(SITE_LINKS).siteUrl;
  private readonly session = inject(SESSION);
  private readonly router = inject(Router);
  /** The address to come back to, from the query's `return`. */
  private readonly returnTo = inject(ActivatedRoute).snapshot.queryParamMap.get('return');
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
