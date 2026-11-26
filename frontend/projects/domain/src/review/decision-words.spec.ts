import type { ReviewDecision, ReviewKind } from '@rent/api';
import { decisionLabel, toDecisionToast } from './decision-words';

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
});
