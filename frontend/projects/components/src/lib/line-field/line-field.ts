import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { Button } from '../button/button';
import type { WordOption } from '../word-toggle/word-toggle';

/**
 * One of Post's large, underlined fields (docs/design-system/components/line-field.html): its
 * visible label, "Optional" when it is optional, a prefix such as "$", the input, a select of
 * units such as "per day" named `unitLabel`, its help or its error tied to it, and a link-styled
 * button that switches it to another way of answering (L2-010, criteria 10, 11 and 13;
 * L2-032, criterion 5). Read-only keeps the value while a listing is sent.
 */
@Component({
  selector: 'cr-line-field',
  imports: [Button],
  templateUrl: './line-field.html',
  styleUrl: './line-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineField {
  /** The input's id, unique on the page; the unit's, help's and error's ids follow from it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** Words after the label, such as "Optional". */
  readonly optional = input<string | null>(null);
  readonly value = model('');
  readonly placeholder = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly prefix = input<string | null>(null);
  readonly units = input<readonly WordOption[] | null>(null);
  readonly unit = model('');
  readonly unitLabel = input('Per');
  readonly help = input<string | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly readonly = input(false);
  readonly switchLabel = input<string | null>(null);
  readonly switched = output<void>();

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-error` : this.help() ? `${this.fieldId()}-help` : null,
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onUnit(event: Event): void {
    this.unit.set((event.target as HTMLSelectElement).value);
  }
}
