import type { ApiFixtures } from './api';
import { SARAH_KIM, type MemberFixture } from './members';
import { photoFile } from './photos';

/** Someone who is a member and an admin, from the mocks' cast. */
export const NAOMI: MemberFixture = {
  ...SARAH_KIM,
  id: '5a7a4c3e-0000-4000-8000-000000000009',
  name: 'Naomi Friesen',
  isAdmin: true,
};

/** The moment the specs read the queue at: Jun 8, 2026, 12:00 p.m. in Langley. */
export const REVIEW_NOW = new Date('2026-06-08T19:00:00Z');

export type ReviewKindFixture = 'new-listing' | 'report' | 'new-member';

/** A row as `GET /api/admin/review-queue` answers it (ReviewItemSummaryDto). */
export interface ReviewRowFixture {
  id: string;
  kind: ReviewKindFixture;
  title: string;
  who: string;
  waitingSince: string;
  offer: 'for-rent' | 'wanted' | null;
  thumbUrl: string | null;
}

const itemId = (n: number) => `4e71e700-0000-4000-8000-${String(n).padStart(12, '0')}`;
const minutesAgo = (minutes: number) =>
  new Date(REVIEW_NOW.getTime() - minutes * 60_000).toISOString();

const photo = (name: string, description: string | null) => ({
  url: `/api/admin/photos/${name}/gallery`,
  thumbUrl: `/api/admin/photos/${name}/thumb`,
  description,
});

export const GARDEN_ROW: ReviewRowFixture = {
  id: itemId(1),
  kind: 'new-listing',
  title: 'Backyard garden for gatherings',
  who: 'The Okafor family',
  waitingSince: minutesAgo(190),
  offer: 'for-rent',
  thumbUrl: '/api/admin/photos/garden/thumb',
};

export const MEMBER_ROW: ReviewRowFixture = {
  id: itemId(2),
  kind: 'new-member',
  title: 'Dr. Alicia Gomez',
  who: 'St. Paul’s Anglican',
  waitingSince: minutesAgo(60),
  offer: null,
  thumbUrl: null,
};

export const REPORT_ROW: ReviewRowFixture = {
  id: itemId(3),
  kind: 'report',
  title: 'Party bus, cheap, DM for details',
  who: 'Mike Rentals',
  waitingSince: minutesAgo(40),
  offer: 'for-rent',
  thumbUrl: null,
};

export const LOCKER_ROW: ReviewRowFixture = {
  id: itemId(4),
  kind: 'new-listing',
  title: 'Storage locker for our food bank',
  who: 'Marcus Lee',
  waitingSince: minutesAgo(12),
  offer: 'wanted',
  thumbUrl: null,
};

/** The queue of the mock's default state, oldest first. */
export const QUEUE = [GARDEN_ROW, MEMBER_ROW, REPORT_ROW, LOCKER_ROW];

const OKAFORS = {
  name: 'The Okafor family',
  isVerified: true,
  joinedAt: '2025-04-12T17:00:00Z',
  church: { name: 'Redeemer Presbyterian', isVerified: true },
};

export const GARDEN_LISTING = {
  id: '1157a000-0000-4000-8000-000000000008',
  offer: 'for-rent',
  kind: 'space',
  title: 'Backyard garden for gatherings',
  price: { amount: 150, period: 'day' },
  when: { text: 'Fridays and Saturdays', start: null, end: null },
  area: 'Brookswood, Langley',
  note: 'Seats 30 at a long table under string lights.',
  photos: [
    photo('garden', 'A long table set for dinner on a lawn under string lights'),
    photo('garden-2', null),
    photo('garden-3', 'A guest room with a made bed'),
  ],
  poster: OKAFORS,
  postedAt: '2026-06-08T16:12:00Z',
};

export const LOCKER_LISTING = {
  id: '1157a000-0000-4000-8000-000000000009',
  offer: 'wanted',
  kind: 'space',
  title: 'Storage locker for our food bank',
  price: { amount: 60, period: 'month' },
  when: { text: null, start: '2026-07-01', end: null },
  area: 'Murrayville, Langley',
  note: 'We need somewhere dry to keep donated tins between Sunday drives.',
  photos: [],
  poster: {
    name: 'Marcus Lee',
    isVerified: true,
    joinedAt: '2024-02-10T17:00:00Z',
    church: { name: 'New Song Fellowship', isVerified: false },
  },
  postedAt: '2026-06-08T19:01:00Z',
};

export const PARTY_BUS_LISTING = {
  id: '1157a000-0000-4000-8000-000000000010',
  offer: 'for-rent',
  kind: 'thing',
  title: 'Party bus, cheap, DM for details',
  price: { amount: 40, period: 'hour' },
  when: { text: 'Any evening', start: null, end: null },
  area: 'Surrey',
  note: 'Great for youth groups. Cash only, message me off-site for the number.',
  photos: [],
  poster: {
    name: 'Mike Rentals',
    isVerified: false,
    joinedAt: '2026-06-01T17:00:00Z',
    church: { name: 'Surrey Open Door', isVerified: false },
  },
  postedAt: '2026-06-06T17:00:00Z',
};

/** The decision table: what each kind of item takes (L2-020). */
const ALLOWED: Record<ReviewKindFixture, string[]> = {
  'new-listing': ['approve', 'remove'],
  report: ['keep', 'remove'],
  'new-member': ['approve', 'remove'],
};

/** The details of `QUEUE`, as `GET /api/admin/review-queue/{id}` answers them, by row. */
export const DETAILS = new Map<string, object>([
  [GARDEN_ROW.id, detailOf(GARDEN_ROW, { listing: GARDEN_LISTING })],
  [
    MEMBER_ROW.id,
    detailOf(MEMBER_ROW, {
      member: {
        name: 'Dr. Alicia Gomez',
        joinedAt: '2026-06-08T18:20:00Z',
        church: {
          name: 'St. Paul’s Anglican',
          city: 'Fort Langley',
          isVerified: false,
          enteredBy: { name: 'Dr. Alicia Gomez', isThisMember: true },
        },
        listingCount: 1,
        forRentCount: 0,
        publicCount: 1,
        messageCount: 0,
      },
    }),
  ],
  [
    REPORT_ROW.id,
    detailOf(REPORT_ROW, {
      report: {
        reason: 'scam',
        note: 'Asking people to pay cash off the site. Doesn’t seem to belong to any church.',
        reportedAt: REPORT_ROW.waitingSince,
        publicSince: '2026-06-06T19:00:00Z',
        listing: PARTY_BUS_LISTING,
      },
    }),
  ],
  [LOCKER_ROW.id, detailOf(LOCKER_ROW, { listing: LOCKER_LISTING })],
]);

export function detailOf(row: ReviewRowFixture, part: object): object {
  return {
    id: row.id,
    version: 0,
    allowedDecisions: ALLOWED[row.kind],
    kind: row.kind,
    waitingSince: row.waitingSince,
    listing: null,
    report: null,
    member: null,
    ...part,
  };
}

/** `count` waiting wanted listings, oldest first, each with a title of its own. */
export function manyRows(count: number): ReviewRowFixture[] {
  return Array.from({ length: count }, (_, index) => ({
    ...LOCKER_ROW,
    id: itemId(100 + index),
    title: `Waiting listing ${index + 1}`,
    waitingSince: minutesAgo(count - index),
  }));
}

/** One page of the queue, as the API answers it. */
export function queuePage(
  items: ReviewRowFixture[],
  nextCursor: string | null = null,
  waitingCount = items.length,
) {
  return { items, nextCursor, waitingCount, asOf: REVIEW_NOW.toISOString() };
}

/** Where an item is decided. */
export const decisionOf = (id: string) => `/api/admin/review-queue/${id}/decision`;

/** A decision the API makes: it names every item that closed, the one decided first. */
export function answerDecision(api: ApiFixtures, id: string, alsoClosed: string[] = []): void {
  api.answer('POST', decisionOf(id), { body: { closedItemIds: [id, ...alsoClosed] } });
}

/** The refusal of a second decision, made at 12:14 p.m. in Langley (ADR 0026). */
export function refuseDecided(
  api: ApiFixtures,
  id: string,
  first: { decision: 'approve' | 'keep' | 'remove'; decidedByYou: boolean },
): void {
  api.answer('POST', decisionOf(id), {
    status: 409,
    body: {
      type: 'about:blank',
      title: 'Already done',
      status: 409,
      code: 'already_decided',
      decidedAt: '2026-06-08T19:14:00Z',
      ...first,
    },
    headers: { 'content-type': 'application/problem+json' },
  });
}

/** The photos of the review fixtures, served from localhost. */
export function answerReviewPhotos(api: ApiFixtures): void {
  for (const name of ['garden', 'garden-2', 'garden-3']) {
    for (const rendition of ['gallery', 'thumb']) {
      api.answer('GET', `/api/admin/photos/${name}/${rendition}`, {
        path: photoFile('hall.jpg'),
        headers: { 'content-type': 'image/jpeg' },
      });
    }
  }
}

export function answerDetail(api: ApiFixtures, id: string, detail: object): void {
  api.answer('GET', `/api/admin/review-queue/${id}`, { body: detail });
}

/** Admin as the backend answers it to an admin: who they are, the queue and each item. */
export function answerAdmin(api: ApiFixtures, rows: ReviewRowFixture[] = QUEUE): void {
  // Who is signed in to Admin, through Admin's own session (ADR 0029).
  api.answer('GET', '/api/admin/session', { body: NAOMI });
  api.answer('GET', '/api/admin/review-queue', { body: queuePage(rows) });
  for (const [id, detail] of DETAILS) {
    answerDetail(api, id, detail);
  }
  answerReviewPhotos(api);
}
