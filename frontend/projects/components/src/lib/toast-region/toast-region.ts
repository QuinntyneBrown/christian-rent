import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Where toasts rise into (docs/design-system/components/toast.html): a polite live region that
 * spans the bottom of a phone and sits 24 rem wide in the bottom right from 640 px. Up to three
 * stack, newest at the bottom. At the `top`, it keeps clear of controls at the bottom of the
 * screen, as Admin's decisions are (WCAG 2.2, 2.4.11).
 */
@Component({
  selector: 'cr-toast-region',
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastRegion {
  readonly placement = input<'bottom' | 'top'>('bottom');
}
