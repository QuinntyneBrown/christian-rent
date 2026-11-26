import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** One word of a word toggle: the value it stands for and the word shown. */
export interface WordOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Two words inside a sentence, both shown, the chosen one highlighted
 * (docs/design-system/components/word-toggle.html; L2-009, criterion 3). It is a radio group
 * named by `label`: each word is a native radio with its visible word as its name, so the arrow
 * keys move between them and a screen reader says which is selected. `side` colours "have" in
 * the for-rent orange and "need" in the wanted blue.
 */
@Component({
  selector: 'cr-word-toggle',
  templateUrl: './word-toggle.html',
  styleUrl: './word-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordToggle {
  /** The radios' shared name, unique on the page. */
  readonly name = input.required<string>();
  /** The group's accessible name, a question such as "A space or a thing?". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly WordOption[]>();
  readonly value = model.required<string>();
  readonly side = input(false);
  readonly disabled = input(false);
}
