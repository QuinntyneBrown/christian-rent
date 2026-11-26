import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** One answer to a radio group's question. */
export interface RadioOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/**
 * One required choice from a short fixed list, none made in advance
 * (docs/design-system/components/radio-group.html): native radios in a fieldset whose legend
 * asks the question. Each row is at least 44 px tall. An error is shown under the options,
 * announced, tied to the group and marked on every radio (L2-032, criteria 4 and 5).
 */
@Component({
  selector: 'cr-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioGroup<T extends string = string> {
  /** The radios' name, and the start of each of their ids. */
  readonly fieldId = input.required<string>();
  readonly legend = input.required<string>();
  readonly options = input.required<readonly RadioOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly disabled = input(false);
}
