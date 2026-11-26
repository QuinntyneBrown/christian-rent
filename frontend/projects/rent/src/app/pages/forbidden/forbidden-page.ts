import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import { Button, PlainPage, SiteHeader } from '@rent/components';

/**
 * Admin's address, opened by anyone who is not an admin (L2-019, criterion 11; ADR 0024): it
 * says the page is for admins, names who is signed in, and leads back to Browse. Admin's own
 * code is never loaded for it.
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

  /** The name is text, never HTML (L2-026). */
  protected readonly text = computed(() => {
    const member = this.member();
    return member
      ? `You’re signed in as ${member.name}, who isn’t an admin of christian.rent.`
      : 'You’re not signed in as an admin of christian.rent.';
  });
}
