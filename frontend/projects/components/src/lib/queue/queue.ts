import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Alert } from '../alert/alert';
import { FeedStatus } from '../feed-status/feed-status';

/**
 * Admin's review queue (docs/design-system/components/queue-item.html, the `queue` block): the
 * heading "Review" with its summary, on a phone the note that deciding needs a wider screen
 * (L2-031, criterion 7), the items the consumer projects with `slot="item"`, and what follows the
 * list (loading more, or a failure with "Try again"). The space the window released above and
 * below the items is reserved by `before` and `after` (ADR 0013).
 */
@Component({
  selector: 'cr-queue',
  imports: [Alert, FeedStatus],
  templateUrl: './queue.html',
  styleUrl: './queue.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--queue-before.px]': 'before()',
    '[style.--queue-after.px]': 'after()',
  },
})
export class Queue {
  readonly headingId = input.required<string>();
  /** "4 waiting · oldest first", or what the queue is doing. */
  readonly summary = input.required<string>();
  /** True when the summary is announced as it changes (loading). */
  readonly announce = input(false);
  /** True while there are items to list. */
  readonly listed = input(false);
  readonly before = input(0);
  readonly after = input(0);
  /** The next page: none asked, in flight, failed, or none left. */
  readonly more = input<'idle' | 'loading' | 'failed' | 'done'>('idle');
  /** "Try again" after the next page failed. */
  readonly retryMore = output();
}
