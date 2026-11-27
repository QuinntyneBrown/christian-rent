import { Injector, createEnvironmentInjector, type EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAX_TOASTS, TOAST_MS, ToastQueue } from './toast-queue';

let injector: EnvironmentInjector;

function create(): ToastQueue {
  injector = createEnvironmentInjector(
    [ToastQueue],
    TestBed.inject(Injector) as EnvironmentInjector,
  );
  return injector.get(ToastQueue);
}

const titles = (queue: ToastQueue) => queue.toasts().map((toast) => toast.title);

// decide-review-item design; L2-020 criterion 14; ADR 0025. Time is a fake clock.
describe('ToastQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets a toast leave after 8 s', () => {
    const queue = create();
    queue.push({ tone: 'success', title: 'Approved', text: '' });

    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(titles(queue)).toEqual(['Approved']);
    vi.advanceTimersByTime(1);
    expect(titles(queue)).toEqual([]);
  });

  it('keeps a failure until it is dismissed', () => {
    const queue = create();
    const id = queue.push({ tone: 'danger', title: 'Your decision wasn’t saved', text: '' });

    vi.advanceTimersByTime(TOAST_MS * 10);
    expect(queue.toasts()[0]).toMatchObject({ timed: false });

    queue.dismiss(id);
    expect(titles(queue)).toEqual([]);
  });

  it('holds the time while the pointer or the focus is on it, and goes on from where it was', () => {
    const queue = create();
    const id = queue.push({ tone: 'success', title: 'Approved', text: '' });
    vi.advanceTimersByTime(3_000);

    queue.hold(id, 'pointer');
    queue.hold(id, 'focus');
    expect(queue.toasts()[0]!.paused).toBe(true);
    vi.advanceTimersByTime(TOAST_MS * 2);
    queue.release(id, 'pointer');
    vi.advanceTimersByTime(TOAST_MS);
    expect(titles(queue)).toEqual(['Approved']);

    queue.release(id, 'focus');
    expect(queue.toasts()[0]!.paused).toBe(false);
    vi.advanceTimersByTime(TOAST_MS - 3_000 - 1);
    expect(titles(queue)).toEqual(['Approved']);
    vi.advanceTimersByTime(1);
    expect(titles(queue)).toEqual([]);
  });

  it('shows three at most: a fourth drops the oldest that is not a failure', () => {
    const queue = create();
    queue.push({ tone: 'danger', title: 'Failed', text: '' });
    queue.push({ tone: 'success', title: 'First', text: '' });
    queue.push({ tone: 'success', title: 'Second', text: '' });

    queue.push({ tone: 'info', title: 'Third', text: '' });

    expect(queue.toasts()).toHaveLength(MAX_TOASTS);
    expect(titles(queue)).toEqual(['Failed', 'Second', 'Third']);
  });

  it('dismisses a toast, then runs its action', () => {
    const queue = create();
    const seen: string[][] = [];
    const id = queue.push({
      tone: 'danger',
      title: 'Failed',
      text: '',
      actionLabel: 'Try again',
      action: () => seen.push(titles(queue)),
    });

    queue.act(id);

    expect(seen).toEqual([[]]);
  });

  it('clears every timer when Admin is left', () => {
    const queue = create();
    queue.push({ tone: 'success', title: 'Approved', text: '' });
    queue.push({ tone: 'info', title: 'New', text: '' });

    injector.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
