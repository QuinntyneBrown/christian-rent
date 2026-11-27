import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SESSION, SITE_LINKS } from '@rent/api';
import { AdminGate, Button, Icon, PlainPage } from '@rent/components';

/**
 * What anyone signed in to Admin who is not an admin finds there: a refusal on Admin's own page,
 * with no queue data, "Sign out" and a way to christian.rent (L2-019, criteria 5, 11 and 22;
 * L2-038, criterion 3). When Admin cannot ask who is signed in, it says so and offers to try
 * again, which asks afresh.
 */
@Component({
  selector: 'cr-forbidden-page',
  imports: [AdminGate, Button, Icon, PlainPage],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  private readonly session = inject(SESSION);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly siteUrl = inject(SITE_LINKS).siteUrl;
  protected readonly unreachable = computed(() => this.session.state() === 'unknown');
  protected readonly signingOut = signal(false);

  protected readonly text = computed(() => {
    const member = this.session.member();
    return member
      ? `You’re signed in as ${member.name}, who isn’t an admin of christian.rent.`
      : 'You’re signed in, but not as an admin of christian.rent.';
  });

  /** Ends the Admin session alone and shows Admin's sign-in page (L2-039, criterion 2). */
  protected async signOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.session.signOut();
    } catch {
      // Forgotten here all the same; the backend's session ends with its lifetime.
    }
    await this.router.navigate(['/sign-in']);
  }

  /** Asks again who is signed in, from the start. */
  protected tryAgain(): void {
    this.document.location.reload();
  }
}
