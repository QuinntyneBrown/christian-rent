import { Injectable, signal } from '@angular/core';
import type { ToastTone } from '@rent/components';

/** A toast to show. One with the `key` of a toast shown replaces it. */
export interface ToastRequest {
  readonly key: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly text: string;
  /** Its one action, if any. */
  readonly action?: { readonly label: string; readonly run: () => void };
}

export interface ToastView extends ToastRequest {
  readonly id: number;
}

/**
 * Admin's notifications, newest last (decide-review-item design). Provided by the Admin screen,
 * so they go when the admin leaves it.
 */
@Injectable()
export class ToastQueue {
  private readonly _toasts = signal<readonly ToastView[]>([]);
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  push(request: ToastRequest): void {
    this.dismissKey(request.key);
    this._toasts.update((toasts) => [...toasts, { ...request, id: this.nextId++ }]);
  }

  dismiss(id: number): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Dismisses the toast about `key`, if one is shown. */
  dismissKey(key: string): void {
    const shown = this._toasts().find((toast) => toast.key === key);
    if (shown) {
      this.dismiss(shown.id);
    }
  }
}
