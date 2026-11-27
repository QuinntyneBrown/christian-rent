import { Injector, createEnvironmentInjector, type EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NewItemsWatch, POLL_MS } from './new-items-watch';
import { ReviewQueueStore } from './review-queue-store';
import { ToastQueue } from './toast-queue';

/** A queue whose arrivals a test sets. */
class FakeQueue {
  arrived = 0;
  asked = 0;
  loads = 0;

  arrivedSinceLoad(): Promise<number> {
    this.asked++;
    return Promise.resolve(this.arrived);
  }

  load(): Promise<void> {
    this.loads++;
    this.arrived = 0;
    return Promise.resolve();
  }
}

let queue: FakeQueue;
let toasts: ToastQueue;
let injector: EnvironmentInjector;

function start(): void {
  queue = new FakeQueue();
  injector = createEnvironmentInjector(
    [NewItemsWatch, ToastQueue, { provide: ReviewQueueStore, useValue: queue }],
    TestBed.inject(Injector) as EnvironmentInjector,
  );
  toasts = injector.get(ToastQueue);
  injector.get(NewItemsWatch).start();
}

async function tick(): Promise<void> {
  vi.advanceTimersByTime(POLL_MS);
  await Promise.resolve();
  await Promise.resolve();
}

const titles = () => toasts.toasts().map((toast) => toast.title);

// L2-019 criterion 12; ADR 0025. Time is a fake clock.
describe('NewItemsWatch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('asks every 60 s and says how many arrived, once', async () => {
    start();
    vi.advanceTimersByTime(POLL_MS - 1);
    expect(queue.asked).toBe(0);

    queue.arrived = 1;
    await tick();
    expect(titles()).toEqual(['1 new item is waiting']);
    queue.arrived = 3;
    await tick();
    expect(titles()).toEqual(['3 new items are waiting']);
    await tick();

    // Nothing more arrived: nothing more is said, and the toast has left by itself.
    expect(queue.asked).toBe(3);
    expect(titles()).toEqual([]);
  });

  it('replaces a toast still held open with the new count', async () => {
    start();
    queue.arrived = 1;
    await tick();
    toasts.hold(toasts.toasts()[0]!.id, 'pointer');

    queue.arrived = 2;
    await tick();

    expect(titles()).toEqual(['2 new items are waiting']);
  });

  it('reads the queue again from "Show them"', async () => {
    start();
    queue.arrived = 2;
    await tick();

    toasts.act(toasts.toasts()[0]!.id);
    queue.arrived = 1;
    await tick();

    expect(queue.loads).toBe(1);
    expect(titles()).toEqual(['1 new item is waiting']);
  });

  it('asks nothing while the page is hidden', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    start();

    await tick();

    expect(queue.asked).toBe(0);
  });

  it('stops asking when Admin is left', async () => {
    start();

    injector.destroy();
    await tick();

    expect(queue.asked).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
