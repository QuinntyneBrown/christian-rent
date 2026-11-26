import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/** The icon that says each tone along with the title (toast.html). */
const TONE_ICONS: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  danger: 'x-circle',
};

/**
 * A short message that rises from the corner (docs/design-system/components/toast.html). It
 * never dismisses itself; the person dismisses it. The region that holds it announces it.
 */
@Component({
  selector: 'cr-toast',
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  readonly tone = input<ToastTone>('info');
  readonly title = input.required<string>();
  readonly text = input('');
  /** The label of the one action, if any. */
  readonly actionLabel = input<string | null>(null);

  protected readonly icon = computed(() => TONE_ICONS[this.tone()]);
  /** A failure or a warning interrupts; anything else waits its turn. */
  protected readonly role = computed(() =>
    this.tone() === 'danger' || this.tone() === 'warning' ? 'alert' : 'status',
  );

  readonly action = output();
  readonly dismissed = output();
}
