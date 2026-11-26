import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * What follows the last row of the review queue while more items wait (docs/design-system/
 * components/queue-item.html): how many are shown and a way to load the next page, which also
 * loads by itself as it is reached. Loading says so and keeps the button busy; a failure is
 * announced and offers "Try again".
 */
@Component({
  selector: 'cr-queue-more',
  imports: [Button],
  templateUrl: './queue-more.html',
  styleUrl: './queue-more.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueMore {
  readonly state = input.required<'idle' | 'loading' | 'failed'>();
  readonly shown = input.required<number>();
  readonly total = input.required<number>();
  /** How many the next page holds. */
  readonly next = input.required<number>();
  readonly more = output<void>();
}
