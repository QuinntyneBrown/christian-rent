import { join } from 'node:path';
import type { ApiFixtures } from './api';

/**
 * One listing as `GET /api/listings/{id}` answers it (ListingDetailDto), from the mocks' cast
 * (docs/mocks/README.md). The cast is data, not rules.
 */
export interface ListingDetailFixture {
  id: string;
  offer: 'for-rent' | 'wanted';
  kind: 'space' | 'thing';
  title: string;
  price: { amount: number; period: 'hour' | 'day' | 'week' | 'month' } | null;
  when: { text: string | null; start: string | null; end: string | null };
  area: string;
  distanceKm: number | null;
  note: string | null;
  postedAt: string;
  photos: {
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    description: string | null;
  }[];
  poster: {
    name: string;
    isVerified: boolean;
    memberSince: number;
    church: { name: string; isVerified: boolean };
  };
  isOwn: boolean;
  /** When the person reading it reported it; null for everyone else. */
  reportedAt: string | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** An instant `ms` before now, as the API writes it, so "Posted 2 days ago" holds on any day. */
export function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

export { DAY, HOUR };

const PHOTOS = ['hall', 'hall-2', 'hall-3', 'room', 'tools', 'trailer'] as const;
type PhotoName = (typeof PHOTOS)[number];

function photo(name: PhotoName, description: string | null) {
  return {
    url: `/api/photos/${name}/gallery`,
    thumbUrl: `/api/photos/${name}/thumb`,
    width: 1600,
    height: 1200,
    description,
  };
}

/** The hall, as `pages/listing/default.html` draws it: three photos, member and church verified. */
export function hall(overrides: Partial<ListingDetailFixture> = {}): ListingDetailFixture {
  return {
    id: '1157a000-0001-4000-8000-000000000001',
    offer: 'for-rent',
    kind: 'space',
    title: 'Sunlit fellowship hall for 80',
    price: { amount: 45, period: 'hour' },
    when: { text: 'Weekdays and Saturdays', start: null, end: null },
    area: 'Langley',
    distanceKm: null,
    note: 'Our hall sits empty most of the week. Round tables, 80 chairs, a small kitchen and a coffee bar. Great for showers, small-group retreats and homeschool co-ops.',
    postedAt: ago(2 * DAY + HOUR),
    photos: [
      photo('hall', 'A bright hall with round tables, folding chairs and tall arched windows'),
      photo('hall-2', null),
      photo('hall-3', 'Round tables and folding chairs beside a row of tall arched windows'),
    ],
    poster: {
      name: 'Pastor Dan Whitaker',
      isVerified: true,
      memberSince: 2023,
      church: { name: 'Grace Community Church', isVerified: true },
    },
    isOwn: false,
    reportedAt: null,
    ...overrides,
  };
}

/** The van, as `pages/listing/wanted.html` draws it: only the member verified. */
export function van(overrides: Partial<ListingDetailFixture> = {}): ListingDetailFixture {
  return {
    id: '1157a000-0005-4000-8000-000000000005',
    offer: 'wanted',
    kind: 'thing',
    title: '15-passenger van for youth camp',
    price: { amount: 120, period: 'day' },
    when: { text: null, start: '2026-07-14', end: '2026-07-18' },
    area: 'Murrayville, Langley',
    distanceKm: null,
    note: 'Our youth group is taking 13 kids to camp in the Okanagan. We need a van with valid ICBC insurance. We’ll return it cleaner than we found it.',
    postedAt: ago(DAY + HOUR),
    photos: [],
    poster: {
      name: 'Marcus Lee',
      isVerified: true,
      memberSince: 2024,
      church: { name: 'New Song Fellowship', isVerified: false },
    },
    isOwn: false,
    reportedAt: null,
    ...overrides,
  };
}

/** The counselling office, as `pages/listing/unverified.html` draws it: neither verified. */
export function office(overrides: Partial<ListingDetailFixture> = {}): ListingDetailFixture {
  return {
    id: '1157a000-0006-4000-8000-000000000006',
    offer: 'wanted',
    kind: 'space',
    title: 'Small office for weekly counselling',
    price: { amount: 300, period: 'month' },
    when: { text: 'Tuesdays and Thursdays', start: null, end: null },
    area: 'Fort Langley',
    distanceKm: null,
    note: 'Registered clinical counsellor looking for a private, quiet room with two chairs. A church office or a spare room in a ministry building would be perfect.',
    postedAt: ago(6 * HOUR + 60_000),
    photos: [],
    poster: {
      name: 'Dr. Alicia Gomez',
      isVerified: false,
      memberSince: 2026,
      church: { name: 'St. Paul’s Anglican', isVerified: false },
    },
    isOwn: false,
    reportedAt: null,
    ...overrides,
  };
}

/** The gym, as `pages/listing/edge.html` draws it: one photo, long words, no note. */
export function gym(overrides: Partial<ListingDetailFixture> = {}): ListingDetailFixture {
  return hall({
    id: '1157a000-0010-4000-8000-000000000010',
    title: 'Gymnasium with a full-size hardwood court, bleachers and a kitchenette',
    price: { amount: 1250.5, period: 'week' },
    when: { text: 'Friday evenings and most Saturdays', start: null, end: null },
    area: 'Walnut Grove, Langley',
    note: null,
    postedAt: ago(3 * 7 * DAY + HOUR),
    photos: [
      photo('hall-3', 'Round tables and folding chairs beside a row of tall arched windows'),
    ],
    poster: {
      name: 'Bartholomew Oyelaran-Featherstonehaugh',
      isVerified: true,
      memberSince: 2025,
      church: { name: 'Fraser Valley Evangelical Missionary Fellowship', isVerified: false },
    },
    ...overrides,
  });
}

/** Answers `GET /api/listings/{id}` with the listing, and its photos from localhost. */
/** The address of one listing's read, as `ApiFixtures` keys it. */
export function listingPath(id: string): string {
  return `/api/listings/${id}`;
}

export function answerListing(api: ApiFixtures, listing: ListingDetailFixture): void {
  api.answer('GET', listingPath(listing.id), { body: listing });
  answerGalleryPhotos(api);
}

/** Answers every gallery and thumb rendition with the sample photo it names. */
export function answerGalleryPhotos(api: ApiFixtures): void {
  for (const name of PHOTOS) {
    for (const rendition of ['gallery', 'thumb']) {
      api.answer('GET', `/api/photos/${name}/${rendition}`, {
        path: join(__dirname, 'photos', `${name}.jpg`),
        headers: { 'content-type': 'image/jpeg' },
      });
    }
  }
}
