import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The photos of a listing for rent (docs/design-system/components/photo-picker.html): a group
 * named "Photos" with how many are added of the most, the Add tile, and the rules as help
 * (L2-013). Journey 7 adds the photos themselves; until then Add is disabled (ADR 0019).
 */
@Component({
  selector: 'cr-photo-picker',
  imports: [Icon],
  templateUrl: './photo-picker.html',
  styleUrl: './photo-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPicker {
  /** The group label's id, unique on the page. */
  readonly fieldId = input.required<string>();
  readonly count = input(0);
  readonly max = input(6);
  readonly disabled = input(false);
  readonly add = output<void>();
}
