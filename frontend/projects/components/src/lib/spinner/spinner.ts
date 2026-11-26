import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A small turning ring for a wait that has no shape (docs/design-system/components/spinner.html),
 * always beside words that say what is awaited; the ring itself is decoration.
 */
@Component({
  selector: 'cr-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class Spinner {
  /** 40 px instead of 20 px. */
  readonly large = input(false);
}
