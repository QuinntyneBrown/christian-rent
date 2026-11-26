import { queueSummary } from './queue-summary';

// L2-019 criteria 3, 6 and 10; L2-033 criteria 1, 2 and 5.
describe('queueSummary', () => {
  it.each([
    [{ state: 'loading', told: false, waiting: 0, held: 0 }, ''],
    [{ state: 'loading', told: true, waiting: 0, held: 0 }, 'Loading the queue…'],
    [{ state: 'failed', told: false, waiting: 0, held: 0 }, 'The queue didn’t load'],
    [{ state: 'empty', told: false, waiting: 0, held: 0 }, 'Nothing is waiting'],
    [{ state: 'loaded', told: false, waiting: 4, held: 4 }, '4 waiting · oldest first'],
    [
      { state: 'loaded', told: false, waiting: 63, held: 50 },
      '63 waiting · oldest first · showing 50',
    ],
    // More are held than wait once items have left the queue since a page was read.
    [{ state: 'loaded', told: false, waiting: 3, held: 4 }, '3 waiting · oldest first'],
  ] as const)('says %o as "%s"', (queue, words) => {
    expect(queueSummary(queue)).toBe(words);
  });
});
