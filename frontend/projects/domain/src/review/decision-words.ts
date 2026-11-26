import type { ReviewDecision, ReviewKind } from '@rent/api';

/** What a decision is about: the kind of item, and the listing's title or the member's name. */
export interface DecisionSubject {
  readonly kind: ReviewKind;
  readonly name: string;
}

/** What a removal is about: also who posted the listing, who is told of it. */
export interface RemoveSubject extends DecisionSubject {
  readonly poster: string | null;
}

/** The words of the confirmation of Remove, and of its failure. */
export interface RemoveCopy {
  readonly title: string;
  readonly description: string;
  readonly confirm: string;
  readonly failedTitle: string;
  readonly failedText: string;
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

/** The confirmation of Remove names what is removed and says what follows (L2-020, criterion 9). */
export function toRemoveCopy({ kind, name, poster }: RemoveSubject): RemoveCopy {
  const member = kind === 'new-member';
  const recorded = 'Your name and the time are recorded.';
  const follows = member
    ? `${name} can no longer sign in, post or message, and their listings stop being public.`
    : kind === 'report'
      ? `The listing stops being public, every open report on it is closed, and ${poster} is told it was removed.`
      : `The listing never becomes public, and ${poster} is told it was removed.`;
  return {
    title: member ? `Remove ${name}?` : `Remove “${name}”?`,
    description: `${follows} ${recorded}`,
    confirm: member ? 'Remove member' : 'Remove listing',
    failedTitle: member ? 'The member wasn’t removed.' : 'The listing wasn’t removed.',
    failedText: 'We couldn’t reach christian.rent. Nothing has changed.',
  };
}

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
