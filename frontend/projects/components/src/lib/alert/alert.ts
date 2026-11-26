import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * A message inside the page, at the place it is about (docs/design-system/components/alert.html):
 * what happened, and what is safe and what to do. The icon carries the tone with the title, so
 * colour is never the only carrier. `announce` makes it a live `alert`, for a failure that
 * appears after an action; an alert that is there from the start is not announced.
 */
@Component({
  selector: 'cr-alert',
  imports: [Icon],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly announce = input(false);

  protected readonly icon = computed<IconName>(() => ICONS[this.tone()]);
}

const ICONS: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  danger: 'alert',
};
