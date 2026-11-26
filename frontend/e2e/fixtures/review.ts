import type { ApiFixtures } from './api';
import type { MemberFixture } from './members';
import { photoFile } from './photos';

/** An admin, as `GET /api/members/me` answers her (ADR 0024: an operator made her one). */
export const NAOMI_FRIESEN: MemberFixture = {
  id: '5a7a4c3e-0000-4000-8000-0000000000ad',
  name: 'Naomi Friesen',
  churchName: 'Grace Community Church',
  isVerified: true,
  isAdmin: true,
};

/** The moment the review specs stand at; each item's wait is counted back from it (L38). */
export const REVIEW_NOW = new Date(2026, 5, 8, 15, 0);

function ago(minutes: number): string {
  return new Date(REVIEW_NOW.getTime() - minutes * 60_000).toISOString();
}

/** One row of the queue as `GET /api/review-queue` answers it (ReviewItemSummaryDto). */
export interface QueueItemFixture {
  id: string;
  kind: 'new-listing' | 'report' | 'new-member';
  title: string;
  who: string;
  waitingSince: string;
  offer: 'for-rent' | 'wanted' | null;
  thumbUrl: string | null;
}

const YARD_PHOTO = 'f070a11d-0010-4000-8000-000000000001';

/** The queue of the default mock, oldest first: a new listing, a new member, a report, a wanted listing. */
export const YARD: QueueItemFixture = {
  id: 'ae1e0000-0000-4000-8000-000000000001',
  kind: 'new-listing',
  title: 'Backyard garden for gatherings',
  who: 'The Okafor family',
  waitingSince: ago(180),
  offer: 'for-rent',
  thumbUrl: `/api/photos/${YARD_PHOTO}/thumb`,
};

export const ALICIA: QueueItemFixture = {
  id: 'ae1e0000-0000-4000-8000-000000000002',
  kind: 'new-member',
  title: 'Dr. Alicia Gomez',
  who: 'St. Paul’s Anglican',
  waitingSince: ago(60),
  offer: null,
  thumbUrl: null,
};

export const PARTY_BUS: QueueItemFixture = {
  id: 'ae1e0000-0000-4000-8000-000000000003',
  kind: 'report',
  title: 'Party bus, cheap, DM for details',
  who: 'Mike Rentals',
  waitingSince: ago(40),
  offer: 'for-rent',
  thumbUrl: null,
};

export const LOCKER: QueueItemFixture = {
  id: 'ae1e0000-0000-4000-8000-000000000004',
  kind: 'new-listing',
  title: 'Storage locker for our food bank',
  who: 'Marcus Lee',
  waitingSince: ago(12),
  offer: 'wanted',
  thumbUrl: null,
};

export const QUEUE = [YARD, ALICIA, PARTY_BUS, LOCKER];

/** `n` new members, one a minute, as a long queue holds them. */
export function manyItems(n: number, from = 0): QueueItemFixture[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `ae1e0000-0000-4000-8000-${String(from + index + 100).padStart(12, '0')}`,
    kind: 'new-member' as const,
    title: `Member ${String(from + index).padStart(3, '0')}`,
    who: 'Grace Community Church',
    waitingSince: ago(1000 - from - index),
    offer: null,
    thumbUrl: null,
  }));
}

/** An admin is signed in. */
export function answerAdmin(api: ApiFixtures): void {
  api.answer('GET', '/api/members/me', { body: NAOMI_FRIESEN });
}

/**
 * The queue as the backend answers it: pages of 50 by `cursor` (the index of the page's first
 * item), oldest first, with how many wait (ADR 0024). The yard's photo is served from localhost.
 */
export function answerQueue(api: ApiFixtures, items: QueueItemFixture[] = QUEUE): void {
  api.answer('GET', '/api/review-queue', (url) => {
    const from = Number(url.searchParams.get('cursor') ?? 0);
    const page = items.slice(from, from + 50);
    const next = from + 50 < items.length ? String(from + 50) : null;
    return { body: { items: page, nextCursor: next, waitingCount: items.length } };
  });
  api.answer('GET', `/api/photos/${YARD_PHOTO}/thumb`, {
    path: photoFile('hall.jpg'),
    headers: { 'content-type': 'image/jpeg' },
  });
  api.answer('GET', `/api/photos/${YARD_PHOTO}/gallery`, {
    path: photoFile('hall.jpg'),
    headers: { 'content-type': 'image/jpeg' },
  });
}

/** Every page request the queue made, as `GET /api/review-queue?cursor=…`. */
export function queueRequests(api: ApiFixtures): string[] {
  return api.requests.filter(
    (request) =>
      request.startsWith('GET /api/review-queue?') || request === 'GET /api/review-queue',
  );
}

/** The detail of each item of `QUEUE`, as `GET /api/review-queue/{id}` answers it. */
export const DETAILS: Record<string, unknown> = {
  [YARD.id]: {
    id: YARD.id,
    kind: 'new-listing',
    waitingSince: YARD.waitingSince,
    listing: {
      id: '1157a000-0000-4000-8000-0000000000a1',
      offer: 'for-rent',
      kind: 'space',
      title: 'Backyard garden for gatherings',
      price: { amount: 150, period: 'day' },
      when: { text: 'Fridays and Saturdays', start: null, end: null },
      area: 'Brookswood, Langley',
      note: 'Seats 30 at a long table under string lights. Perfect for rehearsal dinners, baptism parties and small-group cookouts.',
      postedAt: new Date(2026, 5, 8, 9, 12).toISOString(),
      approvedAt: null,
      photos: [
        {
          url: `/api/photos/${YARD_PHOTO}/gallery`,
          thumbUrl: `/api/photos/${YARD_PHOTO}/thumb`,
          width: 1200,
          height: 900,
          description: 'A long table set for dinner on a lawn under string lights',
        },
      ],
      poster: {
        name: 'The Okafor family',
        isVerified: true,
        memberSince: new Date(2025, 3, 2).toISOString(),
        church: { name: 'Redeemer Presbyterian', isVerified: true },
      },
    },
    report: null,
    member: null,
  },
  [ALICIA.id]: {
    id: ALICIA.id,
    kind: 'new-member',
    waitingSince: ALICIA.waitingSince,
    listing: null,
    report: null,
    member: {
      name: 'Dr. Alicia Gomez',
      joinedAt: new Date(2026, 5, 8, 11, 20).toISOString(),
      church: {
        name: 'St. Paul’s Anglican',
        city: 'Fort Langley',
        isVerified: false,
        enteredByThisMember: true,
        enteredByName: 'Dr. Alicia Gomez',
      },
      listings: { forRent: 0, wanted: 1, public: 1 },
      messagesSent: 0,
    },
  },
  [PARTY_BUS.id]: {
    id: PARTY_BUS.id,
    kind: 'report',
    waitingSince: PARTY_BUS.waitingSince,
    listing: {
      id: '1157a000-0000-4000-8000-0000000000b5',
      offer: 'for-rent',
      kind: 'thing',
      title: 'Party bus, cheap, DM for details',
      price: { amount: 40, period: 'hour' },
      when: { text: 'Any evening', start: null, end: null },
      area: 'Surrey',
      note: 'Great for youth groups. Cash only, message me off-site for the number.',
      postedAt: new Date(2026, 5, 6, 8, 0).toISOString(),
      approvedAt: new Date(2026, 5, 6, 9, 30).toISOString(),
      photos: [],
      poster: {
        name: 'Mike Rentals',
        isVerified: false,
        memberSince: new Date(2026, 5, 6, 7, 0).toISOString(),
        church: { name: 'Surrey Open Door', isVerified: false },
      },
    },
    report: {
      reason: 'scam',
      note: 'Asking people to pay cash off the site. Doesn’t seem to belong to any church.',
      reportedAt: PARTY_BUS.waitingSince,
    },
    member: null,
  },
  [LOCKER.id]: {
    id: LOCKER.id,
    kind: 'new-listing',
    waitingSince: LOCKER.waitingSince,
    listing: {
      id: '1157a000-0000-4000-8000-0000000000c3',
      offer: 'wanted',
      kind: 'space',
      title: 'Storage locker for our food bank',
      price: { amount: 60, period: 'month' },
      when: { text: null, start: '2026-07-01', end: null },
      area: 'Murrayville, Langley',
      note: 'We need somewhere dry to keep donated tins between Sunday drives. About the size of a garden shed.',
      postedAt: new Date(2026, 5, 8, 12, 1).toISOString(),
      approvedAt: null,
      photos: [],
      poster: {
        name: 'Marcus Lee',
        isVerified: true,
        memberSince: new Date(2024, 1, 10).toISOString(),
        church: { name: 'New Song Fellowship', isVerified: false },
      },
    },
    report: null,
    member: null,
  },
};

/** Each item's detail, as the backend answers it. */
export function answerDetails(api: ApiFixtures): void {
  for (const [id, detail] of Object.entries(DETAILS)) {
    api.answer('GET', `/api/review-queue/${id}`, { body: detail });
  }
}

/** Every detail request, as `GET /api/review-queue/{id}`. */
export function detailRequests(api: ApiFixtures): string[] {
  return api.requests.filter((request) => /^GET \/api\/review-queue\/[^?]+$/.test(request));
}
