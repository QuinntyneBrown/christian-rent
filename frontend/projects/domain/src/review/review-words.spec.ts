import type { ReviewItemDetail, ReviewListing, ReviewMember } from '@rent/api';
import {
  churchStatus,
  formatDateTime,
  formatMonth,
  memberListings,
  messagesSent,
  reportRest,
  reviewWhen,
  toReviewDetailView,
} from './review-words';

const now = new Date(2026, 5, 8, 15, 0);

// ADR 0024: dates in the browser's time zone.
describe('dates', () => {
  it('says the month and year for "Member since"', () => {
    expect(formatMonth(new Date(2025, 3, 2).toISOString())).toBe('Apr 2025');
  });

  it.each([
    [new Date(2026, 5, 8, 9, 12), 'Jun 8, 2026, 9:12 a.m.'],
    [new Date(2026, 5, 8, 12, 1), 'Jun 8, 2026, 12:01 p.m.'],
    [new Date(2026, 0, 31, 0, 5), 'Jan 31, 2026, 12:05 a.m.'],
  ])('says %s as "%s"', (date, words) => {
    expect(formatDateTime(date.toISOString())).toBe(words);
  });
});

describe('reviewWhen', () => {
  it.each([
    [{ text: 'Any evening', start: null, end: null }, 'Any evening'],
    [{ text: null, start: '2026-07-01', end: null }, 'From Jul 1, 2026'],
    [{ text: null, start: '2026-06-13', end: '2026-06-14' }, 'Jun 13 to 14, 2026'],
    [{ text: null, start: null, end: null }, null],
  ])('says %o as %s', (when, words) => {
    expect(reviewWhen(when)).toBe(words);
  });
});

// ADR 0024: a new member's listings, one case per row.
describe('memberListings', () => {
  it.each([
    [0, 0, 0, 'None'],
    [0, 1, 1, '1 wanted listing, public'],
    [0, 1, 0, '1 wanted listing, not public'],
    [1, 0, 1, '1 listing for rent, public'],
    [2, 0, 1, '2 listings for rent, 1 public'],
    [2, 0, 0, '2 listings for rent, 0 public'],
    [2, 1, 3, '2 listings for rent and 1 wanted listing, all public'],
    [1, 3, 2, '1 listing for rent and 3 wanted listings, 2 public'],
  ])('%i for rent, %i wanted, %i public is "%s"', (forRent, wanted, shown, words) => {
    expect(memberListings({ forRent, wanted, public: shown })).toBe(words);
  });
});

describe('messagesSent', () => {
  it.each([
    [0, 'None'],
    [1, '1 message'],
    [3, '3 messages'],
  ])('%i is "%s"', (count, words) => {
    expect(messagesSent(count)).toBe(words);
  });
});

// ADR 0024: the church's status, one case per row.
describe('churchStatus', () => {
  const church: ReviewMember['church'] = {
    name: 'St. Paul’s Anglican',
    city: 'Fort Langley',
    isVerified: false,
    enteredByThisMember: false,
    enteredByName: null,
  };

  it.each([
    [{ isVerified: true }, 'Verified'],
    [
      { enteredByThisMember: true, enteredByName: 'Dr. Alicia Gomez' },
      'New to christian.rent, entered by this member',
    ],
    [
      { enteredByName: 'Pastor Dan Whitaker' },
      'New to christian.rent, entered by Pastor Dan Whitaker',
    ],
    [{}, 'New to christian.rent'],
  ])('%o is "%s"', (change, words) => {
    expect(churchStatus({ ...church, ...change })).toBe(words);
  });
});

// L2-019 criterion 8; ADR 0024: who reported it is never said.
describe('reportRest', () => {
  const at = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it('quotes the note', () => {
    expect(reportRest({ reason: 'scam', note: 'Cash only.', reportedAt: at(40) }, now)).toBe(
      'by a member, 40 min ago: “Cash only.”',
    );
  });

  it('ends with a full stop when there is no note', () => {
    expect(reportRest({ reason: 'other', note: '  ', reportedAt: at(0) }, now)).toBe(
      'by a member, just now.',
    );
  });
});

const listing: ReviewListing = {
  id: 'listing-1',
  offer: 'for-rent',
  kind: 'thing',
  title: 'Party bus',
  price: { amount: 40, period: 'hour' },
  when: { text: 'Any evening', start: null, end: null },
  area: 'Surrey',
  note: null,
  postedAt: new Date(2026, 5, 6, 8, 0).toISOString(),
  approvedAt: new Date(2026, 5, 6, 9, 30).toISOString(),
  photos: [],
  poster: {
    name: 'Mike Rentals',
    isVerified: false,
    memberSince: new Date(2026, 5, 6, 7).toISOString(),
    church: { name: 'Surrey Open Door', isVerified: true },
  },
};

function detailOf(change: Partial<ReviewItemDetail>): ReviewItemDetail {
  return {
    id: 'item-1',
    kind: 'report',
    decisions: ['keep', 'remove'],
    waitingSince: now.toISOString(),
    listing,
    report: { reason: 'fake', note: null, reportedAt: now.toISOString() },
    member: null,
    ...change,
  };
}

// L2-019 criteria 7 and 8.
describe('toReviewDetailView', () => {
  it('shows a report with "Public since" and a way to the listing', () => {
    const view = toReviewDetailView(detailOf({}), now);

    expect(view).toMatchObject({
      kind: 'listing',
      report: { reason: 'Reported as not a real listing', rest: 'by a member, just now.' },
      media: { kind: 'no-photo' },
      price: '$40 / hour',
      tag: 'For rent · thing',
      siteUrl: '/listings/listing-1',
      decisions: [
        { decision: 'keep', label: 'Keep listing' },
        { decision: 'remove', label: 'Remove' },
      ],
    });
    expect(view?.facts.map((fact) => [fact.name, fact.value, fact.verified])).toEqual([
      ['Posted by', 'Mike Rentals', null],
      ['Church', 'Surrey Open Door', 'church'],
      ['When', 'Any evening', null],
      ['Where', 'Surrey', null],
      ['Member since', 'Jun 2026', null],
      ['Public since', 'Jun 6, 2026', null],
    ]);
  });

  it('shows a new listing with when it was posted, and no way to the site yet', () => {
    const view = toReviewDetailView(
      detailOf({
        kind: 'new-listing',
        report: null,
        listing: { ...listing, approvedAt: null, when: { text: null, start: null, end: null } },
      }),
      now,
    );

    expect(view).toMatchObject({ report: null, siteUrl: null });
    expect(view?.facts.map((fact) => fact.name)).toEqual([
      'Posted by',
      'Church',
      'Where',
      'Member since',
      'Posted',
    ]);
  });

  it('names an undescribed photo by the listing and its place', () => {
    const photo = { url: '/p/g', thumbUrl: '/p/t', width: 1200, height: 900, description: null };
    const view = toReviewDetailView(
      detailOf({ listing: { ...listing, photos: [photo, photo] } }),
      now,
    );

    expect(view).toMatchObject({
      media: { kind: 'photo', url: '/p/g', alt: 'Party bus, photo 1 of 2' },
    });
  });

  it('shows a wanted listing as wanted, with "Up to"', () => {
    const view = toReviewDetailView(
      detailOf({ listing: { ...listing, offer: 'wanted', kind: 'space' } }),
      now,
    );

    expect(view).toMatchObject({
      media: { kind: 'wanted' },
      price: 'Up to $40 / hour',
      tag: 'Wanted · space',
    });
  });
});
