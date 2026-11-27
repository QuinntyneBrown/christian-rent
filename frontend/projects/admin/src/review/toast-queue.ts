import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type { ToastTone } from '@rent/components';

/** A toast to show. One with the `key` of a toast shown replaces it. */
export interface ToastRequest {
  readonly key: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly text: string;
  /** Its one action, if any. */
  readonly action?: { readonly label: string; readonly run: () => unknown };
}

export interface ToastView extends ToastRequest {
  readonly id: number;
  /** Whether its time stands still, because the pointer or the focus is on it. */
  readonly paused: boolean;
}

/** What keeps a toast's time still. */
export type ToastHold = 'pointer' | 'focus';

/** The most shown at once (ADR 0027). */
export const MAX_TOASTS = 3;

/** How long a toast that dismisses itself is shown (L2-020, criterion 14). */
export const TOAST_MS = 8000;

/** The time one toast has left, and what holds it. */
interface Countdown {
  left: number;
  since: number;
  timer: ReturnType<typeof setTimeout> | null;
  readonly holds: Set<ToastHold>;
}

/**
 * Admin's notifications, newest last, at most three (decide-review-item design). Each but a
 * failure dismisses itself after 8 s of not being held by the pointer or the focus; a failure
 * stays until it is dismissed. Provided by the Admin screen, so they and their timers go when
 * the admin leaves it.
 */
@Injectable()
export class ToastQueue {
  private readonly _toasts = signal<readonly ToastView[]>([]);
  private readonly countdowns = new Map<number, Countdown>();
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const countdown of this.countdowns.values()) {
        this.stop(countdown);
      }
      this.countdowns.clear();
    });
  }

  push(request: ToastRequest): void {
    this.dismissKey(request.key);
    const shown = this._toasts();
    if (shown.length >= MAX_TOASTS) {
      // The oldest that would have gone by itself makes way; a failure only among failures.
      this.dismiss((shown.find((toast) => toast.tone !== 'danger') ?? shown[0]!).id);
    }
    const id = this.nextId++;
    this._toasts.update((toasts) => [...toasts, { ...request, id, paused: false }]);
    if (request.tone !== 'danger') {
      const countdown: Countdown = { left: TOAST_MS, since: 0, timer: null, holds: new Set() };
      this.countdowns.set(id, countdown);
      this.start(id, countdown);
    }
  }

  dismiss(id: number): void {
    const countdown = this.countdowns.get(id);
    if (countdown) {
      this.stop(countdown);
      this.countdowns.delete(id);
    }
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Dismisses the toast about `key`, if one is shown. */
  dismissKey(key: string): void {
    const shown = this._toasts().find((toast) => toast.key === key);
    if (shown) {
      this.dismiss(shown.id);
    }
  }

  /** The pointer or the focus came onto a toast, or left it. */
  hold(id: number, by: ToastHold, on: boolean): void {
    const countdown = this.countdowns.get(id);
    if (!countdown) {
      return;
    }
    if (on) {
      countdown.holds.add(by);
    } else {
      countdown.holds.delete(by);
    }
    const paused = countdown.holds.size > 0;
    if (paused && countdown.timer !== null) {
      this.stop(countdown);
      countdown.left = Math.max(0, countdown.left - (Date.now() - countdown.since));
    } else if (!paused && countdown.timer === null) {
      this.start(id, countdown);
    }
    this._toasts.update((toasts) =>
      toasts.map((toast) => (toast.id === id ? { ...toast, paused } : toast)),
    );
  }

  private start(id: number, countdown: Countdown): void {
    countdown.since = Date.now();
    countdown.timer = setTimeout(() => this.dismiss(id), countdown.left);
  }

  private stop(countdown: Countdown): void {
    if (countdown.timer !== null) {
      clearTimeout(countdown.timer);
      countdown.timer = null;
    }
  }
}
