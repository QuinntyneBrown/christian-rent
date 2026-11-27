import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type { ToastTone } from '@rent/components';

/** A toast leaves by itself after 8 s, unless it reports a failure (L2-020, criterion 14). */
export const TOAST_MS = 8_000;

/** At most three toasts show at once (ADR 0025). */
export const MAX_TOASTS = 3;

/** What holds a toast's time still: the pointer, or the focus, on it. */
export type ToastHold = 'pointer' | 'focus';

/** A toast to show. */
export interface ToastRequest {
  readonly tone: ToastTone;
  readonly title: string;
  readonly text: string;
  readonly actionLabel?: string;
  /** What its action does; the toast is dismissed first. */
  readonly action?: () => void;
}

/** A toast shown. */
export interface ToastEntry extends ToastRequest {
  readonly id: number;
  /** It leaves by itself: anything but a failure. */
  readonly timed: boolean;
  readonly paused: boolean;
}

interface Timer {
  handle: ReturnType<typeof setTimeout> | null;
  /** The time it has left, in ms. */
  left: number;
  /** When it started counting down again. */
  since: number;
  holds: Set<ToastHold>;
}

/**
 * Admin's toasts, newest last (decide-review-item design; ADR 0025). Each but a failure leaves
 * after 8 s, its time held while the pointer or the focus is on it. A fourth drops the oldest
 * that is not a failure. Every timer is cleared when its toast goes and when Admin is left.
 */
@Injectable()
export class ToastQueue {
  private readonly _toasts = signal<readonly ToastEntry[]>([]);
  private readonly timers = new Map<number, Timer>();
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.timers.values()) {
        this.stop(timer);
      }
      this.timers.clear();
    });
  }

  /** Shows a toast at the bottom of the stack; returns its id. */
  push(request: ToastRequest): number {
    const id = this.nextId++;
    const timed = request.tone !== 'danger';
    let toasts = [...this._toasts(), { ...request, id, timed, paused: false }];
    while (toasts.length > MAX_TOASTS) {
      const oldest = toasts.find((toast) => toast.timed) ?? toasts[0]!;
      this.forget(oldest.id);
      toasts = toasts.filter((toast) => toast !== oldest);
    }
    this._toasts.set(toasts);
    if (timed) {
      const timer: Timer = { handle: null, left: TOAST_MS, since: 0, holds: new Set() };
      this.timers.set(id, timer);
      this.start(id, timer);
    }
    return id;
  }

  dismiss(id: number): void {
    this.forget(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Its action: the toast goes, then the action runs. */
  act(id: number): void {
    const action = this._toasts().find((toast) => toast.id === id)?.action;
    this.dismiss(id);
    action?.();
  }

  /** The pointer or the focus came onto the toast: its time stands still. */
  hold(id: number, hold: ToastHold): void {
    const timer = this.timers.get(id);
    if (!timer || timer.holds.has(hold)) {
      return;
    }
    timer.holds.add(hold);
    if (timer.handle !== null) {
      this.stop(timer);
      timer.left -= Date.now() - timer.since;
      this.mark(id, true);
    }
  }

  /** The pointer or the focus left the toast: once nothing holds it, its time runs again. */
  release(id: number, hold: ToastHold): void {
    const timer = this.timers.get(id);
    if (!timer || !timer.holds.delete(hold) || timer.holds.size > 0) {
      return;
    }
    this.start(id, timer);
    this.mark(id, false);
  }

  private start(id: number, timer: Timer): void {
    timer.since = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), Math.max(0, timer.left));
  }

  private stop(timer: Timer): void {
    if (timer.handle !== null) {
      clearTimeout(timer.handle);
      timer.handle = null;
    }
  }

  private forget(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      this.stop(timer);
      this.timers.delete(id);
    }
  }

  private mark(id: number, paused: boolean): void {
    this._toasts.update((toasts) =>
      toasts.map((toast) => (toast.id === id ? { ...toast, paused } : toast)),
    );
  }
}
