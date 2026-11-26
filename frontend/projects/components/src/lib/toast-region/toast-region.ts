import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Where toasts rise into (docs/design-system/components/toast.html): a polite live region that
 * spans the bottom of a phone and sits 24 rem wide in the bottom right from 640 px. Up to three
 * stack, newest at the bottom.
 */
@Component({
  selector: 'cr-toast-region',
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastRegion {}
