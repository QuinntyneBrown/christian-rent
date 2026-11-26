import type { QueueItemView, QueueThumbView, ReviewItemSummary, ReviewKind } from '@rent/api';
import { initialsOf } from '../listings/member-name';
import { formatWaiting } from './review-words';

const KINDS: Record<ReviewKind, string> = {
  'new-listing': 'New',
  report: 'Reported',
  'new-member': 'New member',
};

/** What a row of the review queue shows (L2-019, criteria 6 and 14). */
export function toQueueItemView(item: ReviewItemSummary, now: Date): QueueItemView {
  return {
    id: item.id,
    title: item.title,
    meta: `${item.who} · ${formatWaiting(item.waitingSince, now)}`,
    kind: item.kind,
    kindLabel: KINDS[item.kind],
    thumb: thumbOf(item),
  };
}

function thumbOf(item: ReviewItemSummary): QueueThumbView {
  if (item.kind === 'new-member') {
    return { type: 'member', initials: initialsOf(item.title) };
  }
  if (item.offer === 'wanted') {
    return { type: 'wanted' };
  }
  return item.thumbUrl === null ? { type: 'no-photo' } : { type: 'photo', url: item.thumbUrl };
}
