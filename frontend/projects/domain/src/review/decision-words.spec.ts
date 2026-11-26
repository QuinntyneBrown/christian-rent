import type { ReviewDecision, ReviewKind } from '@rent/api';
import { decisionLabel, toDecisionToast, toRemoveCopy } from './decision-words';

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
});
