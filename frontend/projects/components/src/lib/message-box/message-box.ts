import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import type {
  MessageDraft,
  MessageField,
  MessageFormView,
  MessagePriceView,
  MessageSentView,
} from '@rent/api';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { DateRange } from '../date-range/date-range';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Textarea } from '../textarea/textarea';

let nextId = 0;

/**
 * The panel beside a listing that sends a message to the person who posted it
 * (docs/design-system/components/message-box.html; L2-015). Its head names the price with its
 * currency, "Rent for $45 CAD / hour" or "They’ll pay Up to $120 CAD / day" (L2-022, criterion
 * 9); a wanted listing that gave no price has no head. Below it, by what it is given:
 *
 * - `form`: the dates of a listing for rent, the message with its counter, the button and
 *   "No payment happens here." (L2-024). The view carries every word and state: the errors and
 *   their summary, busy, the failed or limited alert. It emits `draftChange` and `send`.
 * - `sent`: its own confirmation in place of the form, a `status` region that quotes the
 *   message back as text and leads back to Browse (criterion 12).
 * - `own`: "This is your listing.", with no form (criterion 6).
 *
 * While the listing loads it is a skeleton in its shape. It holds no state of its own: the
 * consumer owns the draft.
 */
@Component({
  selector: 'cr-message-box',
  imports: [Alert, Button, DateRange, Icon, NgTemplateOutlet, RouterLink, Skeleton, Textarea],
  templateUrl: './message-box.html',
  styleUrl: './message-box.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBox {
  /** "Message Dan about this listing", for assistive technology. */
  readonly heading = input('');
  readonly price = input<MessagePriceView | null>(null);
  readonly loading = input(false);
  /** The signed-in member posted this listing. */
  readonly own = input(false);
  readonly form = input<MessageFormView | null>(null);
  readonly sent = input<MessageSentView | null>(null);
  readonly draft = input<MessageDraft>({ text: '', startDate: '', endDate: '' });
  readonly draftChange = output<MessageDraft>();
  /** The member asked to send the message; the consumer checks and sends it. */
  readonly send = output<void>();

  protected readonly id = `message-box-${nextId++}`;
  /** The id of each field's input, which the summary's links move focus to. */
  protected readonly fieldIds: Record<MessageField, string> = {
    startDate: `${this.id}-dates-start`,
    endDate: `${this.id}-dates-end`,
    text: `${this.id}-text`,
  };

  private readonly summary = viewChild<Alert>('summary');
  private readonly sentTitle = viewChild<ElementRef<HTMLElement>>('sentTitle');
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('formElement');

  /** Moves focus to the summary of what needs fixing (L2-015, criterion 10). */
  focusSummary(): void {
    this.summary()?.focus();
  }

  /** Moves focus to "Sent to Dan", which announces the confirmation (L2-032, criterion 4). */
  focusSent(): void {
    this.sentTitle()?.nativeElement.focus();
  }

  protected patch(change: Partial<MessageDraft>): void {
    this.draftChange.emit({ ...this.draft(), ...change });
  }

  protected submitted(event: Event): void {
    event.preventDefault();
    if (!this.form()?.busy && !this.form()?.off) {
      this.send.emit();
    }
  }

  /** A summary link moves focus to its field, without changing the address. */
  protected focusField(event: Event, field: MessageField): void {
    event.preventDefault();
    this.formElement()
      ?.nativeElement.querySelector<HTMLElement>(`[id="${this.fieldIds[field]}"]`)
      ?.focus();
  }
}
