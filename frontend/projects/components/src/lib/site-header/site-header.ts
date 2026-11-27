import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MemberSummary, SessionState } from '@rent/api';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

/**
 * The bar at the top of Browse, Listing, Sign in and "not found" (L2-036): the logo, the session
 * control and Post. Once it is known who is signed in, it offers "Sign in", which opens the
 * sign-in page with `returnTo` to come back to, or the member's initials as text and "Sign out"
 * (criteria 1 and 2). With `session` off, on the sign-in page, Post alone. With `plain`, on
 * Post, the logo and a close button only. It has no Messages button (criterion 5).
 */
@Component({
  selector: 'cr-site-header',
  imports: [Button, Icon, Logo, RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly member = input<MemberSummary | null>(null);
  readonly state = input<SessionState>('unknown');
  /** The address "Sign in" brings the person back to. */
  readonly returnTo = input('/');
  /** Whether the session control is shown; the sign-in page leaves it out. */
  readonly session = input(true);
  /** Signing out is in flight. */
  readonly signingOut = input(false);
  readonly plain = input(false);
  readonly signOut = output<void>();
}
