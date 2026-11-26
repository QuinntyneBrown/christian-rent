import type { ReviewItemSummary } from '@rent/api';
import { toQueueItemView } from './queue-item-view';

const NOW = new Date('2026-06-08T19:00:00Z');

function row(overrides: Partial<ReviewItemSummary> = {}): ReviewItemSummary {
  return {
    id: 'i1',
    kind: 'new-listing',
    title: 'Backyard garden',
    who: 'The Okafor family',
    waitingSince: '2026-06-08T16:00:00Z',
    offer: 'for-rent',
    thumbUrl: '/api/photos/p1/thumb',
    ...overrides,
  };
}

// L2-019 criteria 6 and 14.
describe('toQueueItemView', () => {
  it('writes a new listing with who posted it, how long it has waited and its photo', () => {
    expect(toQueueItemView(row(), NOW)).toEqual({
      id: 'i1',
      title: 'Backyard garden',
      meta: 'The Okafor family · 3 hr',
      kind: 'new-listing',
      kindLabel: 'New',
      thumb: { type: 'photo', url: '/api/photos/p1/thumb' },
    });
  });

  // One case per row: the kind in words, and what stands at the start of the row.
  it.each([
    [{ kind: 'new-listing', offer: 'wanted', thumbUrl: null }, 'New', { type: 'wanted' }],
    [{ kind: 'new-listing', thumbUrl: null }, 'New', { type: 'no-photo' }],
    [{ kind: 'report', thumbUrl: null }, 'Reported', { type: 'no-photo' }],
    [{ kind: 'report', offer: 'wanted', thumbUrl: null }, 'Reported', { type: 'wanted' }],
    [{ kind: 'report' }, 'Reported', { type: 'photo', url: '/api/photos/p1/thumb' }],
    [
      { kind: 'new-member', title: 'Dr. Alicia Gomez', offer: null, thumbUrl: null },
      'New member',
      { type: 'member', initials: 'AG' },
    ],
  ] as const)('writes %o as "%s"', (overrides, label, thumb) => {
    const view = toQueueItemView(row(overrides), NOW);

    expect(view.kindLabel).toBe(label);
    expect(view.thumb).toEqual(thumb);
  });
});
