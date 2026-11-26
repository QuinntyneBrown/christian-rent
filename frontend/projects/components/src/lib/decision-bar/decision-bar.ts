import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * The decisions under an item's detail (docs/design-system/components/review-detail.html, the
 * `decision-bar` block): the buttons the consumer projects, then "View on site" for a listing that
 * is public. It stays at the bottom of the panel as the detail scrolls.
 */
@Component({
  selector: 'cr-decision-bar',
  imports: [Icon, RouterLink],
  templateUrl: './decision-bar.html',
  styleUrl: './decision-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecisionBar {
  /** Where "View on site" leads; null shows no link. */
  readonly viewUrl = input<string | null>(null);
}
