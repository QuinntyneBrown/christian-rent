import { TestBed } from '@angular/core/testing';
import type { ToastTone } from '@rent/components';
import { MAX_TOASTS, TOAST_MS, ToastQueue } from './toast-queue';

// decide-review-item design; L2-020 criterion 14, ADR 0027. Time is a fake clock.
describe('ToastQueue', () => {
  let queue: ToastQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [ToastQueue] });
    queue = TestBed.inject(ToastQueue);
  });

  afterEach(() => vi.useRealTimers());

  const push = (key: string, tone: ToastTone = 'success') =>
    queue.push({ key, tone, title: key, text: '' });
  const shown = () => queue.toasts().map((toast) => toast.title);
  const idOf = (key: string) => queue.toasts().find((toast) => toast.title === key)!.id;
  const wait = (ms: number) => vi.advanceTimersByTime(ms);

  it.each<ToastTone>(['info', 'success', 'warning'])('lets a %s toast go after 8 s', (tone) => {
    push('a', tone);

    wait(TOAST_MS - 1);
    expect(shown()).toEqual(['a']);
    wait(1);

    expect(shown()).toEqual([]);
    expect(TOAST_MS).toBe(8000);
  });

  it('keeps a failure until it is dismissed, and times nothing for it', () => {
    push('a', 'danger');

    wait(60_000);

    expect(shown()).toEqual(['a']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stacks the newest last and dismisses each on its own', () => {
    push('a');
    wait(3000);
    push('b', 'danger');
    push('c', 'info');

    queue.dismiss(idOf('b'));

    expect(shown()).toEqual(['a', 'c']);
    wait(TOAST_MS - 3000);
    expect(shown()).toEqual(['c']);
  });

  it.each([
    ['the pointer', 'pointer' as const],
    ['the focus', 'focus' as const],
  ])('pauses the time while %s is on it, and keeps what was left', (_, by) => {
    push('a');
    wait(5000);

    queue.hold(idOf('a'), by, true);
    expect(queue.toasts()[0]!.paused).toBe(true);
    wait(60_000);
    expect(shown()).toEqual(['a']);
    queue.hold(idOf('a'), by, false);

    expect(queue.toasts()[0]!.paused).toBe(false);
    wait(2999);
    expect(shown()).toEqual(['a']);
    wait(1);
    expect(shown()).toEqual([]);
  });

  it('stays paused while either the pointer or the focus remains', () => {
    push('a');
    queue.hold(idOf('a'), 'pointer', true);
    queue.hold(idOf('a'), 'focus', true);

    queue.hold(idOf('a'), 'pointer', false);
    wait(60_000);

    expect(shown()).toEqual(['a']);
  });

  it.each<[string, ToastTone[], string[]]>([
    ['the oldest that would go by itself', ['danger', 'success', 'info'], ['0', '2', '3']],
    ['the oldest when all are failures', ['danger', 'danger', 'danger'], ['1', '2', '3']],
  ])('shows at most 3: a fourth takes the place of %s', (_, tones, left) => {
    tones.forEach((tone, index) => push(String(index), tone));

    push('3', 'danger');

    expect(MAX_TOASTS).toBe(3);
    expect(shown()).toEqual(left);
  });

  it('replaces the toast about the same thing, with a time of its own', () => {
    push('a', 'danger');
    queue.push({ key: 'a', tone: 'success', title: 'again', text: '' });

    expect(shown()).toEqual(['again']);
    wait(TOAST_MS);
    expect(shown()).toEqual([]);
  });

  it('releases every timer when its screen goes, and when a toast does', () => {
    push('a');
    push('b');
    push('c');
    queue.dismiss(idOf('a'));
    push('d');
    push('e');
    expect(vi.getTimerCount()).toBe(MAX_TOASTS);

    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });
});
