import { join } from 'node:path';
import type { ApiFixtures } from './api';

/**
 * Listings as `GET /api/listings` answers them (ListingCardDto), from the mocks' cast
 * (docs/mocks/README.md). The cast is data, not rules.
 */
export interface ListingCardFixture {
  id: string;
  offer: 'for-rent' | 'wanted';
  kind: 'space' | 'thing';
  title: string;
  price: { amount: number; period: 'hour' | 'day' | 'week' | 'month' } | null;
  area: string;
  distanceKm: number | null;
  when: { text: string | null; start: string | null; end: string | null };
  posterName: string;
  churchName: string;
  photo: { url: string; width: number; height: number; description: string | null } | null;
}

const PHOTOS = {
  hall: 'hall.jpg',
  room: 'room.jpg',
  tools: 'tools.jpg',
  trailer: 'trailer.jpg',
} as const;

type PhotoName = keyof typeof PHOTOS;

let nextId = 1;
function id(): string {
  return `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
}

export function forRent(
  title: string,
  overrides: Partial<ListingCardFixture> & { photoName?: PhotoName | null } = {},
): ListingCardFixture {
  const { photoName = 'hall', ...rest } = overrides;
  return {
    id: id(),
    offer: 'for-rent',
    kind: 'space',
    title,
    price: { amount: 45, period: 'hour' },
    area: 'Langley',
    distanceKm: null,
    when: { text: 'Weekdays and Saturdays', start: null, end: null },
    posterName: 'Pastor Dan Whitaker',
    churchName: 'Grace Community Church',
    photo: photoName
      ? {
          url: `/api/photos/${photoName}/card`,
          width: 800,
          height: 600,
          description: `A photo of ${title}`,
        }
      : null,
    ...rest,
  };
}

export function wanted(
  title: string,
  overrides: Partial<ListingCardFixture> = {},
): ListingCardFixture {
  return {
    id: id(),
    offer: 'wanted',
    kind: 'thing',
    title,
    price: null,
    area: 'Abbotsford',
    distanceKm: null,
    when: { text: null, start: '2026-08-08', end: '2026-08-08' },
    posterName: 'Emily Carter',
    churchName: 'Christ Church',
    photo: null,
    ...overrides,
  };
}

/** Browse's seven approved listings, newest first, as the default mock draws them. */
export function cast(): ListingCardFixture[] {
  return [
    forRent('Quiet guest room, month to month', {
      photoName: 'room',
      price: { amount: 850, period: 'month' },
      area: 'Walnut Grove, Langley',
      churchName: 'Willoughby Baptist',
      photo: {
        url: '/api/photos/room/card',
        width: 800,
        height: 600,
        description: 'A guest room with a made bed, a wooden desk and a window with a plant',
      },
    }),
    wanted('Small office for weekly counselling', {
      kind: 'space',
      price: { amount: 300, period: 'month' },
      area: 'Fort Langley',
      when: { text: 'Tuesdays and Thursdays', start: null, end: null },
      posterName: 'Dr. Alicia Gomez',
      churchName: 'St. Paul’s Anglican',
    }),
    wanted('15-passenger van for youth camp', {
      price: { amount: 120, period: 'day' },
      area: 'Murrayville, Langley',
      when: { text: null, start: '2026-07-14', end: '2026-07-18' },
      posterName: 'Marcus Lee',
      churchName: 'New Song Fellowship',
    }),
    forRent('Sunlit fellowship hall for 80'),
    wanted('120 white folding chairs'),
    forRent('Pressure washer and drill kit', {
      photoName: 'tools',
      kind: 'thing',
      price: { amount: 25, period: 'day' },
      area: 'Willoughby, Langley',
      churchName: 'Cornerstone Church',
    }),
    forRent('Vintage camper for mission trips', {
      photoName: 'trailer',
      kind: 'thing',
      price: { amount: 85, period: 'day' },
      area: 'Aldergrove',
    }),
  ];
}

/** `count` listings for rent, numbered from `from`, for paging. */
export function many(count: number, from = 1): ListingCardFixture[] {
  return Array.from({ length: count }, (_, i) =>
    forRent(`Listing ${from + i}`, {
      photoName: (['hall', 'room', 'tools', 'trailer'] as const)[i % 4],
    }),
  );
}

/** A page as the API answers it. */
export function page(
  items: ListingCardFixture[],
  nextCursor: string | null = null,
  counts = {
    everything: items.length,
    forRent: items.filter((item) => item.offer === 'for-rent').length,
    wanted: items.filter((item) => item.offer === 'wanted').length,
  },
) {
  return { items, nextCursor, counts };
}

/** Answers every card photo with the sample photo it names, served from localhost. */
export function answerPhotos(api: ApiFixtures): void {
  for (const [name, file] of Object.entries(PHOTOS)) {
    api.answer('GET', `/api/photos/${name}/card`, {
      path: join(__dirname, 'photos', file),
      headers: { 'content-type': 'image/jpeg' },
    });
  }
}

/** Answers Browse with no listings, for a spec about something else on the screen. */
export function answerNoListings(api: ApiFixtures): void {
  api.answer('GET', '/api/listings', { body: page([]) });
}

/**
 * Answers `GET /api/listings` as the API would from `listings`: narrowed by `show`, `kind` and
 * every word of `q` (in the title, area and note), with the counts for the term and the kind.
 * The fixture stands in for the backend; the matching rule itself is proved there.
 */
export function answerListings(
  api: ApiFixtures,
  listings: ListingCardFixture[],
  notes: Record<string, string> = {},
): void {
  api.answer('GET', '/api/listings', (url) => {
    const show = url.searchParams.get('show');
    const kind = url.searchParams.get('kind');
    const words = (url.searchParams.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const matching = listings.filter((listing) => {
      const text = `${listing.title} ${notes[listing.title] ?? ''} ${listing.area}`.toLowerCase();
      return (!kind || listing.kind === kind) && words.every((word) => text.includes(word));
    });
    const shown = matching.filter((listing) => !show || listing.offer === show);
    return { body: page(shown, null, page(matching).counts) };
  });
}
