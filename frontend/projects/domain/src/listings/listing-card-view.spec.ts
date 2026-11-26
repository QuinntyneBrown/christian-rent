import type { ListingCard } from '@rent/api';
import { toListingCardView } from './listing-card-view';

const hall: ListingCard = {
  id: 'a1',
  offer: 'for-rent',
  kind: 'space',
  title: 'Sunlit fellowship hall for 80',
  price: { amount: 45, period: 'hour' },
  area: 'Langley',
  distanceKm: null,
  when: { text: 'Weekdays and Saturdays', start: null, end: null },
  posterName: 'Pastor Dan Whitaker',
  churchName: 'Grace Community Church',
  photo: { url: '/api/photos/p1/card', width: 800, height: 600, description: 'A bright hall' },
};

const van: ListingCard = {
  ...hall,
  id: 'w1',
  offer: 'wanted',
  kind: 'thing',
  title: '15-passenger van for youth camp',
  price: { amount: 120, period: 'day' },
  area: 'Murrayville, Langley',
  distanceKm: 8,
  when: { text: null, start: '2026-07-14', end: '2026-07-18' },
  posterName: 'Marcus Lee',
  churchName: 'New Song Fellowship',
  photo: null,
};

// L2-001 criteria 3, 4, 5, 7, 8 and 9.
describe('toListingCardView', () => {
  it('draws a listing for rent with its photo, kind, price, area and church', () => {
    expect(toListingCardView(hall)).toEqual({
      href: '/listings/a1',
      wanted: false,
      tag: 'space',
      title: 'Sunlit fellowship hall for 80',
      price: { amount: '$45', per: '/ hour' },
      place: 'Langley',
      church: 'Grace Community Church',
      poster: null,
      when: null,
      photo: { url: '/api/photos/p1/card', width: 800, height: 600, alt: 'A bright hall' },
    });
  });

  it('gives a photo with no description an empty text alternative: the title names the card', () => {
    const card = toListingCardView({ ...hall, photo: { ...hall.photo!, description: null } });

    expect(card.photo?.alt).toBe('');
  });

  it('draws a wanted listing with no photo, "Wanted" in text, the poster and when', () => {
    expect(toListingCardView(van)).toEqual({
      href: '/listings/w1',
      wanted: true,
      tag: 'Wanted · thing',
      title: '15-passenger van for youth camp',
      price: { amount: 'Up to $120', per: '/ day' },
      place: 'Murrayville, Langley · 8 km',
      church: 'New Song Fellowship',
      poster: 'Marcus Lee',
      when: 'Jul 14 to 18, 2026',
      photo: null,
    });
  });

  it('never shows a photo on a wanted card, even if one arrives', () => {
    expect(toListingCardView({ ...van, photo: hall.photo }).photo).toBeNull();
  });
});
