import type { EarlierDecision, ReviewDecision, ReviewKind } from '@rent/api';
import { formatTime } from '../listings/format-retry-at';
import { formatInstant } from './review-words';

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

/** A title and what it says, of a notification or of the panel. */
export interface Notice {
  readonly title: string;
  readonly text: string;
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
export function toDecisionToast(decision: ReviewDecision, subject: DecisionSubject): Notice {
  return { title: DONE[decision], text: nowTrue(decision, subject) };
}

const NOT_APPLIED = 'Your decision was not applied.';

/** Who made the decision that stands, and what it did, in the past tense. */
function earlier({ decision, byYou }: EarlierDecision): string {
  return `${byYou ? 'You' : 'Another admin'} ${DONE[decision].toLowerCase()}`;
}

/**
 * What the panel says of an item decided first: which decision, and when (L2-020, criteria 13
 * and 17). A decision of today says only its time. `now` is passed in, so the rule needs no
 * clock.
 */
export function toConflictCopy(first: EarlierDecision, now: Date): Notice {
  const at = new Date(first.at);
  const when =
    at.toDateString() === now.toDateString()
      ? `at ${formatTime(at)}`
      : `on ${formatInstant(first.at)}`;
  return {
    title: 'This was already decided.',
    // "12:14 p.m." ends its own sentence.
    text: `${earlier(first)} it ${when} ${NOT_APPLIED}`,
  };
}

/** The notification that another decision came first (L2-020, criterion 13). */
export function toConflictToast(first: EarlierDecision, subject: DecisionSubject): Notice {
  return {
    title: 'Already decided',
    text: `${earlier(first)} ${named(subject)} first. ${NOT_APPLIED}`,
  };
}

/** The notification of a decision that could not be saved (L2-020, criterion 12). */
export function toFailedToast(subject: DecisionSubject): Notice {
  return {
    title: 'Your decision wasn’t saved',
    text: `We couldn’t reach christian.rent. ${named(subject)} is still in the queue.`,
  };
}

/** A listing is named by its title in quotation marks; a member by their name. */
function named({ kind, name }: DecisionSubject): string {
  return kind === 'new-member' ? name : `“${name}”`;
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
