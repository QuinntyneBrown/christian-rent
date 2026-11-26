import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Tag } from '../tag/tag';

/**
 * The head of a wanted listing (docs/design-system/components/wanted-panel.html): where a
 * photo would be, the request itself in white on blue, with its tag, its title as the screen's
 * heading, and when it is needed (L2-007, criterion 2).
 */
@Component({
  selector: 'cr-wanted-panel',
  imports: [Icon, Tag],
  templateUrl: './wanted-panel.html',
  styleUrl: './wanted-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WantedPanel {
  readonly tag = input.required<string>();
  readonly title = input.required<string>();
  readonly when = input<string | null>(null);
}
