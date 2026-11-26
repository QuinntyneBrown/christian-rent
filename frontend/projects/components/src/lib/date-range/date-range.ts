import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * "When" as a start and an end date (docs/design-system/components/date-range.html; L2-010,
 * criteria 5 and 10): a fieldset named by its legend, two native date inputs labelled "From"
 * and "To", the range in words once both are chosen, one error tied to the invalid inputs, and
 * the button that switches back to words. The dates are ISO dates (YYYY-MM-DD) or empty.
 */
@Component({
  selector: 'cr-date-range',
  imports: [Button],
  templateUrl: './date-range.html',
  styleUrl: './date-range.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRange {
  /** The prefix of the inputs' ids, unique on the page: `{fieldId}-start`, `{fieldId}-end`. */
  readonly fieldId = input.required<string>();
  readonly legend = input.required<string>();
  /** In the message box the legend is for assistive technology only, and the fields stand alone. */
  readonly legendHidden = input(false);
  /** The earliest start date, as an ISO date, which the browser's picker offers; null for any. */
  readonly min = input<string | null>(null);
  readonly start = model('');
  readonly end = model('');
  /** The range in words, such as "Jul 14 to 18, 2026", or null to show none. */
  readonly summary = input<string | null>(null);
  readonly startError = input<string | null | undefined>(null);
  readonly endError = input<string | null | undefined>(null);
  readonly readonly = input(false);
  readonly switchLabel = input<string | null>(null);
  readonly switched = output<void>();

  /** One message for the range: the start's, else the end's. */
  protected readonly error = computed(() => this.startError() || this.endError() || null);
  protected readonly errorId = computed(() => `${this.fieldId()}-error`);

  protected onStart(event: Event): void {
    this.start.set((event.target as HTMLInputElement).value);
  }

  protected onEnd(event: Event): void {
    this.end.set((event.target as HTMLInputElement).value);
  }
}
