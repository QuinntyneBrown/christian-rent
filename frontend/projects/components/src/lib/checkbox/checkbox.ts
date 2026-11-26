import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * One thing a person agrees to, in the first person, never ticked for them
 * (docs/design-system/components/checkbox.html). The whole row is the target, at least 44 px
 * tall; an error is tied to the box and shown under the row.
 */
@Component({
  selector: 'cr-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkbox {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** Why it is asked, under the statement. */
  readonly description = input<string | null>(null);
  readonly checked = model(false);
  readonly name = input<string | null>(null);
  readonly error = input<string | null | undefined>(null);
  readonly disabled = input(false);

  protected onChange(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
