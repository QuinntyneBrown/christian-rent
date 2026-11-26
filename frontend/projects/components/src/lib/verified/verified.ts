import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The word "Verified" with its icon, beside a member or a church an admin has confirmed
 * (docs/design-system/components/verified.html). Assistive technology hears what is verified:
 * "Verified member", "Verified church". Text, never colour alone (L2-008, criteria 2 and 3).
 */
@Component({
  selector: 'cr-verified',
  imports: [Icon],
  templateUrl: './verified.html',
  styleUrl: './verified.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verified {
  readonly subject = input.required<'member' | 'church'>();
}
