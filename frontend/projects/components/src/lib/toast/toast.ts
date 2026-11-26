import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * A short message that rises from the corner (docs/design-system/components/toast.html). It
 * never dismisses itself; the person dismisses it. The region that holds it announces it.
 */
@Component({
  selector: 'cr-toast',
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

  readonly action = output();
  readonly dismissed = output();
}
