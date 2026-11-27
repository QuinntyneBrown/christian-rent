import type { ReviewDecision, ReviewKind } from '@rent/api';
import {
  decisionLabel,
  toArrivalsToast,
  toConflictCopy,
  toConflictToast,
  toDecisionToast,
  toFailedToast,
  toRemoveCopy,
} from './decision-words';

// decide-review-item design: every word of a decision, one case per row.
describe('decision words', () => {
  // L2-020 criterion 8.
  it.each<[ReviewDecision, string]>([
    ['approve', 'Approve'],
    ['keep', 'Keep listing'],
    ['remove', 'Remove'],
  ])('labels %s "%s"', (decision, label) => {
    expect(decisionLabel(decision)).toBe(label);
  });

  // L2-020 criterion 15: the toast names the decision and says what is now true.
  it.each<[ReviewDecision, ReviewKind, string, string]>([
    ['approve', 'new-listing', 'Approved', '“Garden” is now public on Browse.'],
    ['remove', 'new-listing', 'Removed', '“Garden” won’t appear on Browse.'],
    ['keep', 'report', 'Kept', '“Garden” stays public on Browse. The report is closed.'],
    ['remove', 'report', 'Removed', '“Garden” is no longer public.'],
    ['approve', 'new-member', 'Approved', 'Garden is now a verified member.'],
    ['remove', 'new-member', 'Removed', 'Garden is no longer a member.'],
  ])('says what %s did to a %s', (decision, kind, title, text) => {
    expect(toDecisionToast(decision, { kind, name: 'Garden' })).toEqual({ title, text });
  });

  // L2-020 criteria 9 and 10: the confirmation names what is removed and what follows.
  it.each([
    [
      'report' as const,
      'Remove “Party bus”?',
      'The listing stops being public, every open report on it is closed, and Mike Rentals is told it was removed. Your name and the time are recorded.',
      'Remove listing',
      'The listing wasn’t removed.',
    ],
    [
      'new-listing' as const,
      'Remove “Party bus”?',
      'The listing never becomes public, and Mike Rentals is told it was removed. Your name and the time are recorded.',
      'Remove listing',
      'The listing wasn’t removed.',
    ],
    [
      'new-member' as const,
      'Remove Party bus?',
      'Party bus can no longer sign in, post or message, and their listings stop being public. Your name and the time are recorded.',
      'Remove member',
      'The member wasn’t removed.',
    ],
  ])('confirms the removal of a %s', (kind, title, description, confirm, failedTitle) => {
    expect(toRemoveCopy({ kind, name: 'Party bus', poster: 'Mike Rentals' })).toEqual({
      title,
      description,
      confirm,
      failedTitle,
      failedText: 'We couldn’t reach christian.rent. Nothing has changed.',
    });
  });

  // L2-020 criteria 13 and 17: which decision, when, and by whom as far as it is said.
  it.each<[ReviewDecision, boolean, Date, string]>([
    ['approve', false, new Date(2026, 5, 8, 12, 14), 'Another admin approved it at 12:14 p.m.'],
    ['keep', false, new Date(2026, 5, 8, 9, 5), 'Another admin kept it at 9:05 a.m.'],
    ['remove', true, new Date(2026, 5, 8, 0, 1), 'You removed it at 12:01 a.m.'],
    [
      'approve',
      false,
      new Date(2026, 5, 7, 12, 14),
      'Another admin approved it on Jun 7, 2026, 12:14 p.m.',
    ],
  ])('says that %s came first (own: %s, at %s)', (decision, byYou, at, said) => {
    const now = new Date(2026, 5, 8, 15, 0);

    expect(toConflictCopy({ decision, byYou, at: at.toISOString() }, now)).toEqual({
      title: 'This was already decided.',
      text: `${said} Your decision was not applied.`,
    });
  });

  it.each<[ReviewKind, boolean, ReviewDecision, string]>([
    ['new-listing', false, 'approve', 'Another admin approved “Garden” first.'],
    ['report', false, 'keep', 'Another admin kept “Garden” first.'],
    ['new-member', true, 'remove', 'You removed Garden first.'],
  ])('notifies of a %s decided first (own: %s)', (kind, byYou, decision, said) => {
    expect(toConflictToast({ decision, byYou, at: '' }, { kind, name: 'Garden' })).toEqual({
      title: 'Already decided',
      text: `${said} Your decision was not applied.`,
    });
  });

  // L2-020 criterion 12.
  it.each<[ReviewKind, string]>([
    ['new-listing', '“Garden”'],
    ['report', '“Garden”'],
    ['new-member', 'Garden'],
  ])('says that a decision on a %s was not saved', (kind, named) => {
    expect(toFailedToast({ kind, name: 'Garden' })).toEqual({
      title: 'Your decision wasn’t saved',
      text: `We couldn’t reach christian.rent. ${named} is still in the queue.`,
    });
  });

  // L2-019 criterion 12: how many arrived, and what.
  it.each<[number, number, number, string, string]>([
    [1, 0, 0, '1 new item is waiting', 'A new listing'],
    [0, 1, 0, '1 new item is waiting', 'A report'],
    [0, 0, 1, '1 new item is waiting', 'A new member'],
    [1, 1, 0, '2 new items are waiting', 'A new listing and a report'],
    [2, 1, 1, '4 new items are waiting', '2 new listings, a report and a new member'],
    [0, 3, 2, '5 new items are waiting', '3 reports and 2 new members'],
  ])(
    'tells of %d new listings, %d reports and %d new members',
    (newListings, reports, newMembers, title, what) => {
      expect(toArrivalsToast({ newListings, reports, newMembers })).toEqual({
        title,
        text: `${what} arrived while you were reviewing.`,
      });
    },
  );
});
