import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MemberSummary } from '@rent/api';
import { Logo } from '../logo/logo';

/**
 * The bar at the top of Browse, Listing and "not found" (L2-036): the logo, the member's
 * initials as text, and Post. With `plain`, on Post, the logo and a close button only. It has no
 * Messages button and no sign-in control (criterion 5).
 */
@Component({
  selector: 'cr-site-header',
  imports: [Logo, RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly member = input<MemberSummary | null>(null);
  readonly plain = input(false);
}
