import type { ReviewDecision, ReviewItemDetail, ReviewListing } from '@rent/api';
import {
  alreadyDecidedWords,
  confirmRemoveWords,
  decidedToast,
  failedDecisionToast,
} from './decision-words';

const listing: ReviewListing = {
  id: 'listing-1',
  offer: 'for-rent',
  kind: 'space',
  title: 'Backyard garden for gatherings',
  price: null,
  when: { text: null, start: null, end: null },
  area: 'Brookswood, Langley',
  note: null,
  postedAt: '2026-06-08T12:00:00Z',
  approvedAt: null,
  photos: [],
  poster: {
    name: 'The Okafor family',
    isVerified: true,
    memberSince: '2025-04-02T12:00:00Z',
    church: { name: 'Redeemer Presbyterian', isVerified: true },
  },
};

const newListing: ReviewItemDetail = {
  id: 'item-1',
  kind: 'new-listing',
  decisions: ['approve', 'remove'],
  waitingSince: '2026-06-08T12:00:00Z',
  listing,
  report: null,
  member: null,
};

const report: ReviewItemDetail = {
  ...newListing,
  kind: 'report',
  decisions: ['keep', 'remove'],
  listing: {
    ...listing,
    title: 'Party bus, cheap, DM for details',
    poster: { ...listing.poster, name: 'Mike Rentals' },
  },
  report: { reason: 'scam', note: null, reportedAt: '2026-06-08T14:20:00Z' },
};

const newMember: ReviewItemDetail = {
  ...newListing,
  kind: 'new-member',
  listing: null,
  member: {
    name: 'Dr. Alicia Gomez',
    joinedAt: '2026-06-08T14:00:00Z',
    church: {
      name: 'St. Paul’s Anglican',
      city: 'Langley',
      isVerified: false,
      enteredByThisMember: true,
      enteredByName: 'Dr. Alicia Gomez',
    },
    listings: { forRent: 0, wanted: 0, public: 0 },
    messagesSent: 0,
  },
};

const items = { 'new-listing': newListing, report, 'new-member': newMember };

// ADR 0025: the success toast after each decision, one case per row of the design's table.
describe('decidedToast', () => {
  it.each<[keyof typeof items, ReviewDecision, string, string]>([
    [
      'new-listing',
      'approve',
      'Approved',
      '“Backyard garden for gatherings” is now public on Browse.',
    ],
    [
      'new-listing',
      'remove',
      'Removed',
      '“Backyard garden for gatherings” won’t be public, and The Okafor family is told.',
    ],
    [
      'report',
      'keep',
      'Kept',
      '“Party bus, cheap, DM for details” stays public, and its report is closed.',
    ],
    [
      'report',
      'remove',
      'Removed',
      '“Party bus, cheap, DM for details” is no longer public, and Mike Rentals is told.',
    ],
    ['new-member', 'approve', 'Approved', 'Dr. Alicia Gomez is now verified.'],
    ['new-member', 'remove', 'Removed', 'Dr. Alicia Gomez can no longer post or message.'],
  ])('a %s, %s: "%s"', (kind, decision, title, text) => {
    expect(decidedToast(items[kind], decision)).toEqual({ title, text });
  });
});

// L2-020 criteria 4 and 9; ADR 0025.
describe('confirmRemoveWords', () => {
  it.each<[keyof typeof items, string, string, string, string]>([
    [
      'new-listing',
      'Remove “Backyard garden for gatherings”?',
      'It never becomes public, and The Okafor family is told it was removed. Your name and the time are recorded.',
      'Remove listing',
      'The listing wasn’t removed.',
    ],
    [
      'report',
      'Remove “Party bus, cheap, DM for details”?',
      'The listing stops being public, every open report on it is closed, and Mike Rentals is told it was removed. Your name and the time are recorded.',
      'Remove listing',
      'The listing wasn’t removed.',
    ],
    [
      'new-member',
      'Remove Dr. Alicia Gomez?',
      'They can no longer sign in, post or message, and their listings stop being public. Your name and the time are recorded.',
      'Remove member',
      'The member wasn’t removed.',
    ],
  ])('a %s', (kind, title, description, confirm, failed) => {
    expect(confirmRemoveWords(items[kind])).toEqual({ title, description, confirm, failed });
  });
});

// L2-020 criterion 12.
describe('failedDecisionToast', () => {
  it.each<[keyof typeof items, string]>([
    [
      'new-listing',
      'We couldn’t reach christian.rent. “Backyard garden for gatherings” is still in the queue.',
    ],
    ['new-member', 'We couldn’t reach christian.rent. Dr. Alicia Gomez is still in the queue.'],
  ])('a %s', (kind, text) => {
    expect(failedDecisionToast(items[kind])).toEqual({ title: 'Your decision wasn’t saved', text });
  });
});

// L2-020 criterion 13; ADR 0025: the time in the browser's time zone.
describe('alreadyDecidedWords', () => {
  it.each<[string, keyof typeof items, string, string]>([
    [
      'approve',
      'new-listing',
      'approved it at 12:14 p.m.',
      'approved “Backyard garden for gatherings” first.',
    ],
    ['keep', 'report', 'kept it at 12:14 p.m.', 'kept “Party bus, cheap, DM for details” first.'],
    ['remove', 'new-member', 'removed it at 12:14 p.m.', 'removed Dr. Alicia Gomez first.'],
  ])('another admin chose %s', (decision, kind, panel, toast) => {
    const decidedAt = new Date(2026, 5, 8, 12, 14).toISOString();

    expect(alreadyDecidedWords(items[kind], { decision, decidedAt })).toEqual({
      panel: `Another admin ${panel} Your decision was not applied.`,
      toast: {
        title: 'Already decided',
        text: `Another admin ${toast} Your decision was not applied.`,
      },
    });
  });
});
