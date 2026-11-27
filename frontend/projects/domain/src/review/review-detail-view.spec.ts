import type { ReviewItemDetail, ReviewListing, ReviewMember, ReviewReport } from '@rent/api';
import { toReviewDetailView } from './review-detail-view';

const NOW = new Date('2026-06-08T19:00:00Z');
/** An instant at noon on a local day, so that any zone the tests run in agrees on the day. */
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12, 0).toISOString();

function listing(overrides: Partial<ReviewListing> = {}): ReviewListing {
  return {
    id: 'l1',
    offer: 'for-rent',
    kind: 'space',
    title: 'Backyard garden',
    price: { amount: 150, period: 'day' },
    when: { text: 'Fridays', start: null, end: null },
    area: 'Brookswood, Langley',
    note: 'Seats 30.',
    photos: [
      { url: '/api/photos/p1/gallery', thumbUrl: '/api/photos/p1/thumb', description: 'A lawn' },
      { url: '/api/photos/p2/gallery', thumbUrl: '/api/photos/p2/thumb', description: null },
    ],
    poster: {
      name: 'The Okafor family',
      isVerified: true,
      joinedAt: noon(2025, 4, 12),
      church: { name: 'Redeemer Presbyterian', isVerified: false },
    },
    postedAt: noon(2026, 6, 8),
    ...overrides,
  };
}

function item(part: Partial<ReviewItemDetail>): ReviewItemDetail {
  return {
    id: 'i1',
    kind: 'new-listing',
    waitingSince: noon(2026, 6, 8),
    version: 0,
    allowedDecisions: ['approve', 'remove'],
    listing: null,
    report: null,
    member: null,
    ...part,
  };
}

function report(overrides: Partial<ReviewReport> = {}): ReviewReport {
  return {
    reason: 'scam',
    note: 'Cash only.',
    reportedAt: '2026-06-08T18:20:00Z',
    publicSince: noon(2026, 6, 6),
    listing: listing(),
    ...overrides,
  };
}

function member(overrides: Partial<ReviewMember> = {}): ReviewMember {
  return {
    name: 'Dr. Alicia Gomez',
    joinedAt: noon(2026, 6, 8),
    church: {
      id: 'c1',
      name: 'St. Paul’s Anglican',
      city: 'Fort Langley',
      isVerified: false,
      enteredBy: { name: 'Dr. Alicia Gomez', isThisMember: true },
    },
    listingCount: 1,
    forRentCount: 0,
    publicCount: 1,
    messageCount: 0,
    ...overrides,
  };
}

const factsOf = (detail: ReviewItemDetail) =>
  Object.fromEntries(toReviewDetailView(detail, NOW).facts.map((fact) => [fact.term, fact.value]));

// view-review-queue design; L2-019 criteria 7 to 9 and 15 to 17: every word of the detail.
describe('toReviewDetailView', () => {
  it('writes a new listing with all it needs to be decided on', () => {
    expect(toReviewDetailView(item({ listing: listing() }), NOW)).toEqual({
      type: 'listing',
      report: null,
      wanted: false,
      photos: [
        { url: '/api/photos/p1/gallery', alt: 'A lawn' },
        { url: '/api/photos/p2/gallery', alt: 'Backyard garden, photo 2 of 2' },
      ],
      title: 'Backyard garden',
      price: '$150 / day',
      tag: 'For rent · space',
      note: 'Seats 30.',
      facts: [
        { term: 'Posted by', value: 'The Okafor family', verified: 'member' },
        { term: 'Church', value: 'Redeemer Presbyterian', verified: null },
        { term: 'When', value: 'Fridays', verified: null },
        { term: 'Where', value: 'Brookswood, Langley', verified: null },
        { term: 'Member since', value: 'Apr 2025', verified: null },
        { term: 'Posted', value: 'Jun 8, 2026, 12:00 p.m.', verified: null },
      ],
      siteHref: null,
      decisions: [
        { decision: 'approve', label: 'Approve' },
        { decision: 'remove', label: 'Remove' },
      ],
    });
  });

  it('leaves out what a wanted listing did not say, and shows it no photo', () => {
    const view = toReviewDetailView(
      item({
        listing: listing({
          offer: 'wanted',
          kind: 'thing',
          price: null,
          note: '  ',
          when: { text: null, start: null, end: null },
        }),
      }),
      NOW,
    );

    expect(view).toMatchObject({
      wanted: true,
      photos: [],
      price: null,
      note: null,
      tag: 'Wanted · thing',
    });
    expect(view.facts.map((fact) => fact.term)).not.toContain('When');
  });

  it.each([
    [{ amount: 0, period: 'day' as const }, 'Free'],
    [{ amount: 12.5, period: 'hour' as const }, '$12.50 / hour'],
  ])('writes the price %o as "%s"', (price, words) => {
    expect(toReviewDetailView(item({ listing: listing({ price }) }), NOW)).toMatchObject({
      price: words,
    });
  });

  it('writes a report over the listing, with since when it has been public', () => {
    const detail = item({ kind: 'report', report: report(), allowedDecisions: ['keep', 'remove'] });

    expect(toReviewDetailView(detail, NOW).decisions).toEqual([
      { decision: 'keep', label: 'Keep listing' },
      { decision: 'remove', label: 'Remove' },
    ]);

    expect(toReviewDetailView(detail, NOW)).toMatchObject({
      type: 'listing',
      report: { headline: 'Reported as a scam', rest: ' by a member, 40 min ago: “Cash only.”' },
      siteHref: '/listings/l1',
    });
    expect(factsOf(detail)['Public since']).toBe('Jun 6, 2026');
    expect(factsOf(detail)['Posted']).toBeUndefined();
  });

  // One case per reason.
  it.each([
    ['fake', 'Reported as not a real listing'],
    ['inappropriate', 'Reported as inappropriate'],
    ['scam', 'Reported as a scam'],
    ['other', 'Reported for something else'],
  ] as const)('writes the reason "%s" as "%s"', (reason, headline) => {
    expect(
      toReviewDetailView(item({ kind: 'report', report: report({ reason }) }), NOW),
    ).toMatchObject({ report: { headline } });
  });

  it.each([
    ['2026-06-08T18:59:30Z', ' by a member, just now.'],
    ['2026-06-06T19:00:00Z', ' by a member, 2 days ago.'],
  ])('writes a report made at %s with no note as "%s"', (reportedAt, rest) => {
    expect(
      toReviewDetailView(item({ kind: 'report', report: report({ reportedAt, note: null }) }), NOW),
    ).toMatchObject({ report: { rest } });
  });

  it('writes a new member, who is not named twice as a title and a fact by chance', () => {
    expect(toReviewDetailView(item({ kind: 'new-member', member: member() }), NOW)).toEqual({
      type: 'member',
      initials: 'AG',
      tint: expect.any(String),
      name: 'Dr. Alicia Gomez',
      joined: 'Joined Jun 8, 2026, 12:00 p.m.',
      facts: [
        { term: 'Name', value: 'Dr. Alicia Gomez', verified: null },
        { term: 'Church', value: 'St. Paul’s Anglican, Fort Langley', verified: null },
        { term: 'Declared', value: '“I am a Christian”', verified: null },
        {
          term: 'Church status',
          value: 'New to christian.rent, entered by this member',
          verified: null,
          churchStatus: { confirmable: true },
        },
        { term: 'Listings', value: '1 wanted listing, public', verified: null },
        { term: 'Messages sent', value: 'None', verified: null },
      ],
      decisions: [
        { decision: 'approve', label: 'Approve' },
        { decision: 'remove', label: 'Remove' },
      ],
    });
  });

  // L2-019 criterion 16: one case per row.
  it.each([
    [true, null, 'Verified'],
    [true, { name: 'Dr. Alicia Gomez', isThisMember: true }, 'Verified'],
    [
      false,
      { name: 'Dr. Alicia Gomez', isThisMember: true },
      'New to christian.rent, entered by this member',
    ],
    [
      false,
      { name: 'Mike Rentals', isThisMember: false },
      'New to christian.rent, entered by Mike Rentals',
    ],
    [false, null, 'Not verified'],
  ])('writes a church (verified %s, entered by %o) as "%s"', (isVerified, enteredBy, words) => {
    const church = { id: 'c1', name: 'Open Door', city: 'Surrey', isVerified, enteredBy };

    expect(factsOf(item({ kind: 'new-member', member: member({ church }) }))['Church status']).toBe(
      words,
    );
  });

  // L2-018 criterion 7: only a church that is not verified can be confirmed.
  it.each([
    [false, true],
    [true, false],
  ])('offers to confirm a church that is verified %s: %s', (isVerified, confirmable) => {
    const church = { id: 'c1', name: 'Open Door', city: 'Surrey', isVerified, enteredBy: null };

    const view = toReviewDetailView(item({ kind: 'new-member', member: member({ church }) }), NOW);

    expect(view.facts.filter((fact) => fact.churchStatus)).toEqual([
      expect.objectContaining({ term: 'Church status', churchStatus: { confirmable } }),
    ]);
  });

  // L2-019 criterion 17: listings that are not removed (all, for rent, public).
  it.each([
    [0, 0, 0, 'None'],
    [1, 0, 1, '1 wanted listing, public'],
    [2, 2, 0, '2 listings for rent, not public yet'],
    [1, 1, 0, '1 listing for rent, not public yet'],
    [2, 0, 2, '2 wanted listings, public'],
    [3, 1, 2, '3 listings, 2 public'],
    [2, 1, 0, '2 listings, not public yet'],
  ])('writes %d listings, %d for rent and %d public, as "%s"', (all, forRent, open, words) => {
    const counted = member({ listingCount: all, forRentCount: forRent, publicCount: open });

    expect(factsOf(item({ kind: 'new-member', member: counted }))['Listings']).toBe(words);
  });

  it.each([
    [0, 'None'],
    [1, '1'],
    [12, '12'],
  ])('writes %d messages sent as "%s"', (messageCount, words) => {
    const counted = member({ messageCount });

    expect(factsOf(item({ kind: 'new-member', member: counted }))['Messages sent']).toBe(words);
  });
});
