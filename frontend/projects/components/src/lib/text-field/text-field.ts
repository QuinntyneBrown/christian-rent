import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';

/** What a text field holds: text, an email address, or a password (L2-037, criterion 7). */
export type TextFieldType = 'text' | 'email' | 'password';

/**
 * One line of text in a bordered box, with its visible label above it and its error tied to it
 * (docs/design-system/components/text-field.html, form-field.html; L2-032, criterion 5). An
 * error replaces the help and marks the box `aria-invalid`. Read-only keeps the value and its
 * focus while a request is in flight.
 */
@Component({
  selector: 'cr-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  /** The input's id, unique on the page; the error and help ids follow from it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<TextFieldType>('text');
  readonly value = model('');
  readonly name = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly help = input<string | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly readonly = input(false);
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  /** Moves focus to the box, as a form does to the first field it marks. */
  focus(): void {
    this.box().nativeElement.focus();
  }

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-error` : this.help() ? `${this.fieldId()}-help` : null,
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
