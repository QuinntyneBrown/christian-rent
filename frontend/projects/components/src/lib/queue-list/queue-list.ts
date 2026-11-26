import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The list of the review queue. The consumer projects one `<li>` for each row, so it can mark
 * which page a row came from.
 */
@Component({
  selector: 'cr-queue-list',
  templateUrl: './queue-list.html',
  styleUrl: './queue-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueList {
  readonly busy = input(false);
}
