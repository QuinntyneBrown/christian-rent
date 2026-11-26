import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Alert } from '../alert/alert';

/**
 * The head of the review queue (docs/design-system/components/queue-item.html): its heading,
 * which takes focus after a navigation, one line that says where the queue is, and, under
 * 768 px, why a phone shows only the queue.
 */
@Component({
  selector: 'cr-queue-header',
  imports: [Alert],
  templateUrl: './queue-header.html',
  styleUrl: './queue-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueHeader {
  readonly summary = input.required<string>();
  /** Announces the summary, while the queue is on its way. */
  readonly announce = input(false);
  /** The note for a phone; it is hidden from 768 px up. */
  readonly phoneNote = input<string | null>(null);
}
