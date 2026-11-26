import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/** One choice of a select: what it sends and what it reads. */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * The native select in its form field (docs/design-system/components/select.html): a visible
 * label, a first option that prompts until one is chosen, and an error tied to it. Help, such as
 * "the churches could not be loaded", sits under it, with any action projected after it.
 */
@Component({
  selector: 'cr-select',
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  /** The first option, whose value is empty: "Choose a church". */
  readonly prompt = input<string | null>(null);
  readonly value = model('');
  readonly name = input<string | null>(null);
  readonly help = input<string | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly disabled = input(false);

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-error` : this.help() ? `${this.fieldId()}-help` : null,
  );

  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
