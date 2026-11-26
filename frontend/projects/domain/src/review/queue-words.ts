import type { QueueItemView, ReviewItemKind, ReviewItemSummary } from '@rent/api';
import { initialsOf } from '../listings/member-name';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long something has waited, short (ADR 0024): "just now" under a minute, then "12 min",
 * "3 hr", "2 days", by whole units, rounded down. `now` is passed in, so the rule needs no clock.
 */
export function formatWaited(since: string, now: Date): string {
  const elapsed = now.getTime() - new Date(since).getTime();
  if (elapsed >= DAY) {
    const days = Math.floor(elapsed / DAY);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (elapsed >= HOUR) {
    return `${Math.floor(elapsed / HOUR)} hr`;
  }
  if (elapsed >= MINUTE) {
    return `${Math.floor(elapsed / MINUTE)} min`;
  }
  return 'just now';
}

/** The kind in words, which the tag shows (L2-019, criterion 6). */
export const QUEUE_TAGS: Readonly<Record<ReviewItemKind, string>> = {
  'new-listing': 'New',
  report: 'Reported',
  'new-member': 'New member',
};

/**
 * One row of the queue (L2-019, criterion 6): the title, who and how long, the kind in words,
 * and on the left the listing's photo, "Want" for a wanted listing, the member's initials, or no
 * photo.
 */
export function toQueueItemView(item: ReviewItemSummary, now: Date): QueueItemView {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    meta: `${item.who} · ${formatWaited(item.waitingSince, now)}`,
    tag: QUEUE_TAGS[item.kind],
    thumb: thumbOf(item),
  };
}

function thumbOf(item: ReviewItemSummary): QueueItemView['thumb'] {
  if (item.kind === 'new-member') {
    return { kind: 'member', initials: initialsOf(item.title) };
  }
  if (item.offer === 'wanted') {
    return { kind: 'wanted' };
  }
  return item.thumbUrl === null ? { kind: 'no-photo' } : { kind: 'photo', url: item.thumbUrl };
}

/** Where the queue is, as its heading's summary says it. */
export type QueueSummaryState = 'loading' | 'failed' | 'empty' | 'loaded';

/**
 * The summary under "Review" (L2-019, criteria 6 and 10): "4 waiting · oldest first", with
 * "· showing 50" while fewer are held than wait.
 */
export function queueSummary(state: QueueSummaryState, waiting: number, shown: number): string {
  switch (state) {
    case 'loading':
      return 'Loading the queue…';
    case 'failed':
      return 'The queue didn’t load';
    case 'empty':
      return 'Nothing is waiting';
    case 'loaded':
      return shown < waiting
        ? `${waiting} waiting · oldest first · showing ${shown}`
        : `${waiting} waiting · oldest first`;
  }
}
