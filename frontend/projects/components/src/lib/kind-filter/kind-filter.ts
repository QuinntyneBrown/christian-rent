import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ListingKind } from '@rent/api';

/** All, or one kind. */
export type KindChoice = 'all' | ListingKind;

const OPTIONS: readonly { kind: KindChoice; label: string }[] = [
  { kind: 'all', label: 'All' },
  { kind: 'space', label: 'Spaces' },
  { kind: 'thing', label: 'Things' },
];

/**
 * Narrows Browse to spaces or to things (docs/design-system/components/kind-filter.html;
 * L2-035): a group named "Kind" of toggle buttons, exactly one pressed, its state carried by
 * `aria-pressed` (criterion 4). Pressing an option emits its kind.
 */
@Component({
  selector: 'cr-kind-filter',
  templateUrl: './kind-filter.html',
  styleUrl: './kind-filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KindFilter {
  readonly kind = input<KindChoice>('all');
  readonly kindChange = output<KindChoice>();

  protected readonly options = OPTIONS;
}
