import type { ReviewItemSummary } from '@rent/api';
import {
  formatWaited,
  newItemsToast,
  queueSummary,
  selectedItem,
  toQueueItemView,
} from './queue-words';

const now = new Date('2026-06-08T22:00:00Z');

function before(ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

const MINUTE = 60_000;

// ADR 0024: how long an item has waited, by whole units, rounded down.
describe('formatWaited', () => {
  it.each([
    [0, 'just now'],
    [59_999, 'just now'],
    [MINUTE, '1 min'],
    [12 * MINUTE + 59_000, '12 min'],
    [59 * MINUTE, '59 min'],
    [60 * MINUTE, '1 hr'],
    [3 * 60 * MINUTE + 59 * MINUTE, '3 hr'],
    [23 * 60 * MINUTE, '23 hr'],
    [24 * 60 * MINUTE, '1 day'],
    [49 * 60 * MINUTE, '2 days'],
  ])('%i ms is "%s"', (elapsed, words) => {
    expect(formatWaited(before(elapsed), now)).toBe(words);
  });
});

const listing: ReviewItemSummary = {
  id: 'a',
  kind: 'new-listing',
  title: 'Backyard garden for gatherings',
  who: 'The Okafor family',
  waitingSince: before(180 * MINUTE),
  offer: 'for-rent',
  thumbUrl: '/api/photos/p/thumb',
};

// L2-019 criterion 6: the title, who and how long, the kind in words, and the thumbnail.
describe('toQueueItemView', () => {
  it('shows a new listing with its photo', () => {
    expect(toQueueItemView(listing, now)).toEqual({
      id: 'a',
      kind: 'new-listing',
      title: 'Backyard garden for gatherings',
      meta: 'The Okafor family · 3 hr',
      tag: 'New',
      thumb: { kind: 'photo', url: '/api/photos/p/thumb' },
    });
  });

  it('shows "Want" for a wanted listing', () => {
    const wanted = { ...listing, offer: 'wanted' as const, thumbUrl: null };
    expect(toQueueItemView(wanted, now).thumb).toEqual({ kind: 'wanted' });
  });

  it('shows no photo for a report of a listing without one', () => {
    const report = { ...listing, kind: 'report' as const, thumbUrl: null };
    const view = toQueueItemView(report, now);
    expect(view.thumb).toEqual({ kind: 'no-photo' });
    expect(view.tag).toBe('Reported');
  });

  it('shows a new member by their initials and church', () => {
    const member: ReviewItemSummary = {
      ...listing,
      kind: 'new-member',
      title: 'Dr. Alicia Gomez',
      who: 'St. Paul’s Anglican',
      offer: null,
      thumbUrl: null,
      waitingSince: before(60 * MINUTE),
    };
    expect(toQueueItemView(member, now)).toMatchObject({
      meta: 'St. Paul’s Anglican · 1 hr',
      tag: 'New member',
      thumb: { kind: 'member', initials: 'AG' },
    });
  });
});

// L2-019 criteria 3, 6 and 10; L2-033 criterion 2.
describe('queueSummary', () => {
  it.each([
    ['loading', 0, 0, 'Loading the queue…'],
    ['failed', 0, 0, 'The queue didn’t load'],
    ['empty', 0, 0, 'Nothing is waiting'],
    ['loaded', 4, 4, '4 waiting · oldest first'],
    ['loaded', 63, 50, '63 waiting · oldest first · showing 50'],
    ['loaded', 1, 1, '1 waiting · oldest first'],
  ] as const)('%s with %i waiting and %i shown is "%s"', (state, waiting, shown, words) => {
    expect(queueSummary(state, waiting, shown)).toBe(words);
  });
});

// ADR 0024: the address holds the selection; otherwise the first item.
describe('selectedItem', () => {
  it.each([
    [null, ['a', 'b'], null, 'a'],
    ['b', ['a', 'b'], null, 'b'],
    ['z', ['a', 'b'], null, 'a'],
    ['z', ['a', 'b'], 'z', 'z'],
    [null, [], null, null],
    ['z', [], null, null],
  ] as const)('asked for %s among %o with %s open is %s', (requested, listed, open, selected) => {
    expect(selectedItem(requested, listed, open)).toBe(selected);
  });
});

// L2-019 criterion 12; ADR 0025.
describe('newItemsToast', () => {
  it.each([
    [1, '1 new item is waiting'],
    [2, '2 new items are waiting'],
  ])('%i arrived: "%s"', (count, title) => {
    expect(newItemsToast(count)).toEqual({
      title,
      text: 'They arrived while you were reviewing.',
    });
  });
});
