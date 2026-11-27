import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SESSION, SITE_LINKS } from '@rent/api';
import { AdminGate, Button, PlainPage } from '@rent/components';

/**
 * What anyone signed in to Admin who is not an admin finds there: a refusal on Admin's own page,
 * with no queue data and a way to christian.rent (L2-019, criteria 5, 11 and 22; L2-038,
 * criterion 3).
 */
@Component({
  selector: 'cr-forbidden-page',
  imports: [AdminGate, Button, PlainPage],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  private readonly session = inject(SESSION);
  protected readonly siteUrl = inject(SITE_LINKS).siteUrl;

  protected readonly text = computed(() => {
    const member = this.session.member();
    if (member) {
      return `You’re signed in as ${member.name}, who isn’t an admin of christian.rent.`;
    }
    return this.session.state() === 'signed-in'
      ? 'You’re signed in, but not as an admin of christian.rent.'
      : 'You aren’t signed in as an admin of christian.rent.';
  });
}
