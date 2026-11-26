import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * A message inside the page, at the place it is about (docs/design-system/components/alert.html):
 * what happened, and what is safe and what to do. The icon carries the tone with the title, so
 * colour is never the only carrier. `announce` makes it a live `alert`, for a failure that
 * appears after an action; an alert that is there from the start is not announced. `summary`
 * makes it a form's error summary (`form-summary`), which lists the consumer's links to the
 * invalid fields and takes focus with `focus()` (L2-010, criterion 8).
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
  /** The line that carries the tone; null for a note of one sentence. */
  readonly title = input<string | null>(null);
  readonly text = input<string | null>(null);
  readonly announce = input(false);
  readonly summary = input(false);

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  focus(): void {
    this.box().nativeElement.focus();
  }

  protected readonly icon = computed<IconName>(() => ICONS[this.tone()]);
}

const ICONS: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  danger: 'alert',
};
