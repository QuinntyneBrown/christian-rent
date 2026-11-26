import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * A quiet link back to where a person came from, with an arrow: "All listings"
 * (docs/design-system/components/link.html, the back link). The consumer projects its label.
 */
@Component({
  selector: 'cr-back-link',
  imports: [Icon, RouterLink],
  templateUrl: './back-link.html',
  styleUrl: './back-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackLink {
  readonly href = input.required<string>();
}
