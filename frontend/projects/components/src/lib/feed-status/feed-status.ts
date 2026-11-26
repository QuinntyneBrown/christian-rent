import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Spinner } from '../spinner/spinner';

/**
 * What follows the last card of a list that grows (docs/design-system/components/spinner.html,
 * empty-state.html): while the next page loads, a spinner and its words in a status; when it
 * failed, the words and "Try again" in an alert. Both are announced (L2-006, criteria 3 and 4).
 */
@Component({
  selector: 'cr-feed-status',
  imports: [Button, Icon, Spinner],
  templateUrl: './feed-status.html',
  styleUrl: './feed-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedStatus {
  readonly state = input.required<'loading' | 'failed'>();
  readonly text = input.required<string>();
  readonly actionLabel = input('Try again');
  /** "Try again" was pressed. */
  readonly action = output();
}
