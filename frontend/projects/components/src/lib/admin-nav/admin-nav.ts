import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

/**
 * Admin's rail (docs/design-system/components/admin-nav.html): the logo, who the admin is, the
 * review queue with how many items wait, and the way back to the site. It is a bar along the
 * top on a phone, icons from 768 px, and shows its words from 992 px.
 */
@Component({
  selector: 'cr-admin-nav',
  imports: [Icon, Logo, RouterLink],
  templateUrl: './admin-nav.html',
  styleUrl: './admin-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNav {
  readonly name = input.required<string>();
  /** How many items wait; null or 0 shows no count. */
  readonly waiting = input<number | null>(null);
}
