import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * A whole screen that has nothing else to show: "not found", "not allowed", "not loaded"
 * (docs/design-system/components/empty-state.html, the plain-page block). An icon, the screen's
 * heading, one sentence, and the ways forward the consumer projects. The heading takes focus
 * after a navigation.
 */
@Component({
  selector: 'cr-plain-page',
  imports: [Icon],
  templateUrl: './plain-page.html',
  styleUrl: './plain-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlainPage {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}
