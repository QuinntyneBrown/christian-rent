import type { ReviewDecision, ReviewKind } from '@rent/api';

/** What a decision is about: the kind of item, and the listing's title or the member's name. */
export interface DecisionSubject {
  readonly kind: ReviewKind;
  readonly name: string;
}

const LABELS: Record<ReviewDecision, string> = {
  approve: 'Approve',
  keep: 'Keep listing',
  remove: 'Remove',
};

/** What a decision's button says (L2-020, criterion 8). */
export function decisionLabel(decision: ReviewDecision): string {
  return LABELS[decision];
}

const DONE: Record<ReviewDecision, string> = {
  approve: 'Approved',
  keep: 'Kept',
  remove: 'Removed',
};

/** The notification of a decision that was made (L2-020, criterion 15). */
export function toDecisionToast(
  decision: ReviewDecision,
  subject: DecisionSubject,
): { readonly title: string; readonly text: string } {
  return { title: DONE[decision], text: nowTrue(decision, subject) };
}

function nowTrue(decision: ReviewDecision, { kind, name }: DecisionSubject): string {
  if (kind === 'new-member') {
    return decision === 'approve'
      ? `${name} is now a verified member.`
      : `${name} is no longer a member.`;
  }
  const listing = `“${name}”`;
  switch (decision) {
    case 'approve':
      return `${listing} is now public on Browse.`;
    case 'keep':
      return `${listing} stays public on Browse. The report is closed.`;
    case 'remove':
      // A new listing was never public; a reported one was.
      return kind === 'report'
        ? `${listing} is no longer public.`
        : `${listing} won’t appear on Browse.`;
  }
}
