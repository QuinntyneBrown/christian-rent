import type { ListingDetail } from '@rent/api';
import { toListingView } from './listing-view';

const NOW = new Date('2026-06-10T15:00:00Z');

function hall(overrides: Partial<ListingDetail> = {}): ListingDetail {
  return {
    id: 'l1',
    offer: 'for-rent',
    kind: 'space',
    title: 'Sunlit fellowship hall for 80',
    price: { amount: 45, period: 'hour' },
    when: { text: 'Weekdays and Saturdays', start: null, end: null },
    area: 'Langley',
    distanceKm: null,
    note: 'Our hall sits empty most of the week.',
    postedAt: '2026-06-08T14:00:00Z',
    photos: [
      {
        url: '/api/photos/p1/gallery',
        thumbUrl: '/api/photos/p1/thumb',
        width: 1600,
        height: 1200,
        description: 'A bright hall',
      },
      {
        url: '/api/photos/p2/gallery',
        thumbUrl: '/api/photos/p2/thumb',
        width: 1600,
        height: 1200,
        description: null,
      },
    ],
    poster: {
      name: 'Pastor Dan Whitaker',
      isVerified: true,
      memberSince: 2023,
      church: { name: 'Grace Community Church', isVerified: false },
    },
    isOwn: false,
    ...overrides,
  };
}

// read-listing design; L2-007, L2-008 and L2-022: every word the Listing screen shows.
describe('toListingView', () => {
  it('writes a listing for rent', () => {
    expect(toListingView(hall(), NOW)).toEqual({
      wanted: false,
      tag: 'For rent · space',
      title: 'Sunlit fellowship hall for 80',
      photos: [
        {
          url: '/api/photos/p1/gallery',
          thumbUrl: '/api/photos/p1/thumb',
          width: 1600,
          height: 1200,
          alt: 'A bright hall',
        },
        {
          url: '/api/photos/p2/gallery',
          thumbUrl: '/api/photos/p2/thumb',
          width: 1600,
          height: 1200,
          alt: 'Sunlit fellowship hall for 80, photo 2 of 2',
        },
      ],
      place: 'Langley',
      when: 'Weekdays and Saturdays',
      posted: 'Posted 2 days ago',
      note: 'Our hall sits empty most of the week.',
      poster: {
        name: 'Pastor Dan Whitaker',
        initials: 'DW',
        tint: 'sun',
        isVerified: true,
        church: 'Grace Community Church',
        churchIsVerified: false,
        since: 'Member since 2023',
      },
      messageHeading: 'Message Dan about this listing',
      posterFirstName: 'Dan',
      isOwn: false,
      price: { eyebrow: 'Rent for', amount: '$45', unit: 'CAD / hour' },
    });
  });

  it('writes a wanted listing, with no photo and what they will pay', () => {
    const view = toListingView(
      hall({
        offer: 'wanted',
        kind: 'thing',
        price: { amount: 120, period: 'day' },
        when: { text: null, start: '2026-07-14', end: '2026-07-18' },
        distanceKm: 8,
        poster: {
          name: 'Marcus Lee',
          isVerified: true,
          memberSince: 2024,
          church: { name: 'New Song Fellowship', isVerified: false },
        },
      }),
      NOW,
    );

    expect(view.wanted).toBe(true);
    expect(view.tag).toBe('Wanted · thing');
    expect(view.photos).toEqual([]);
    expect(view.when).toBe('Jul 14 to 18, 2026');
    expect(view.place).toBe('Langley · 8 km');
    expect(view.messageHeading).toBe('Offer to help Marcus about this listing');
    expect(view.posterFirstName).toBe('Marcus');
    expect(view.price).toEqual({ eyebrow: 'They’ll pay', amount: 'Up to $120', unit: 'CAD / day' });
  });

  it('writes no price for a wanted listing that gave none, and "Free" with no unit', () => {
    expect(toListingView(hall({ offer: 'wanted', price: null }), NOW).price).toBeNull();
    expect(toListingView(hall({ price: { amount: 0, period: 'day' } }), NOW).price).toEqual({
      eyebrow: 'Rent for',
      amount: 'Free',
      unit: null,
    });
  });

  it('keeps a blank note as no note', () => {
    expect(toListingView(hall({ note: '   ' }), NOW).note).toBeNull();
  });
});
