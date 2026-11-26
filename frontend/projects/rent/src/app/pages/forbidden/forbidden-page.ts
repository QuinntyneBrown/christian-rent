import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import { Button, PlainPage, SiteHeader } from '@rent/components';

/**
 * What anyone but an admin finds at Admin's address: a refusal, with no queue data and a way
 * back to Browse (L2-019, criteria 5 and 22).
 */
@Component({
  selector: 'cr-forbidden-page',
  imports: [Button, PlainPage, RouterLink, SiteHeader],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  protected readonly member = inject(SESSION).member;

  protected readonly text = computed(() => {
    const member = this.member();
    return member
      ? `You’re signed in as ${member.name}, who isn’t an admin of christian.rent.`
      : 'You aren’t signed in as an admin of christian.rent.';
  });
}
