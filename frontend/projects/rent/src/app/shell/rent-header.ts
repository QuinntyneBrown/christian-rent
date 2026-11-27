import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SESSION } from '@rent/api';
import { SiteHeader } from '@rent/components';
import { filter, map } from 'rxjs';

/**
 * `rent`'s header on every page (L2-036; ADR 0029): `cr-site-header` with who is signed in, the
 * address "Sign in" brings the person back to, and "Sign out", which ends the member session and
 * forgets what was kept in the tab (L2-039). Signing out of Post leaves it for Browse, since
 * Post needs a member; any other screen stays.
 */
@Component({
  selector: 'cr-rent-header',
  imports: [SiteHeader],
  templateUrl: './rent-header.html',
  styleUrl: './rent-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentHeader {
  readonly plain = input(false);
  /** Whether the session control is shown; the sign-in page leaves it out. */
  readonly session = input(true);

  protected readonly current = inject(SESSION);
  private readonly router = inject(Router);
  protected readonly here = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly signingOut = signal(false);

  protected async signOut(): Promise<void> {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);
    try {
      await this.current.signOut();
    } catch {
      // The session is forgotten here all the same; the backend's ends with its lifetime.
    } finally {
      this.signingOut.set(false);
    }
    if (this.router.url.startsWith('/post')) {
      await this.router.navigateByUrl('/');
    }
  }
}
