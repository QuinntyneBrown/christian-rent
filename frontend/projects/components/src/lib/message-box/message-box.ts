import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MessagePriceView } from '@rent/api';
import { Skeleton } from '../skeleton/skeleton';

let nextId = 0;

/**
 * The panel beside a listing (docs/design-system/components/message-box.html). Its head names
 * the price with its currency, "Rent for $45 CAD / hour" or "They’ll pay Up to $120 CAD / day"
 * (L2-007, criterion 10; L2-022, criterion 9); the consumer projects what follows. The
 * send-message journey adds the form and its states. With no price there is nothing to show
 * yet (ADR 0015); while the listing loads it is a skeleton in its shape.
 */
@Component({
  selector: 'cr-message-box',
  imports: [Skeleton],
  templateUrl: './message-box.html',
  styleUrl: './message-box.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBox {
  /** "Message Dan about this listing", for assistive technology. */
  readonly heading = input('');
  readonly price = input<MessagePriceView | null>(null);
  readonly loading = input(false);

  protected readonly headingId = `message-box-heading-${nextId++}`;
}
