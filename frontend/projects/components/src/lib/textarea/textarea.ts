import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/**
 * Several lines of text with their visible label, "Optional" when optional, a counter of what
 * is used, and the error tied to it (docs/design-system/components/textarea.html; L2-010,
 * criteria 7 and 15; L2-032, criterion 5). `maxlength` stops typing at the limit.
 */
@Component({
  selector: 'cr-textarea',
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Textarea {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly optional = input<string | null>(null);
  readonly value = model('');
  readonly placeholder = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly rows = input(3);
  /** What is used of the limit, such as "55 / 1,000". */
  readonly counter = input<string | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly readonly = input(false);

  protected readonly describedBy = computed(
    () =>
      [
        this.error() ? `${this.fieldId()}-error` : null,
        this.counter() ? `${this.fieldId()}-counter` : null,
      ]
        .filter(Boolean)
        .join(' ') || null,
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
