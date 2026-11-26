import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

/**
 * Admin's ink rail (docs/design-system/components/admin-nav.html): the logo, "Admin · {name}",
 * Review with how many items wait, and "Back to site". A bar on a phone, a rail from 768 px,
 * with its words from 992 px.
 */
@Component({
  selector: 'cr-admin-nav',
  imports: [Icon, Logo, RouterLink],
  templateUrl: './admin-nav.html',
  styleUrl: './admin-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNav {
  /** The admin's name, as text. */
  readonly name = input.required<string>();
  /** How many items wait; null while it is not known. */
  readonly waiting = input<number | null>(null);

  protected readonly label = computed(() => `Admin · ${this.name()}`);
  protected readonly waitingLabel = computed(() => `${this.waiting()} waiting`);
}
