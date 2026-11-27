import type { ReviewDecision, ReviewItemDetail } from '@rent/api';
import { formatTime } from '../listings/format-retry-at';

/** The decision buttons' words (L2-020, criterion 8). */
export const DECISION_LABELS: Readonly<Record<ReviewDecision, string>> = {
  approve: 'Approve',
  keep: 'Keep listing',
  remove: 'Remove',
};

/** A toast's title and text. */
export interface ToastWords {
  readonly title: string;
  readonly text: string;
}

/** The confirmation before Remove, and what it says when the removal fails (ADR 0025). */
export interface ConfirmRemoveWords {
  readonly title: string;
  readonly description: string;
  readonly confirm: string;
  readonly failed: string;
}

/** What another admin's decision was, said in the panel and in a toast (ADR 0025). */
export interface AlreadyDecidedWords {
  readonly panel: string;
  readonly toast: ToastWords;
}

const DONE: Readonly<Record<ReviewDecision, string>> = {
  approve: 'approved',
  keep: 'kept',
  remove: 'removed',
};

/** A listing by its title in quotes; a member by their name. Text, never HTML. */
function subject(detail: ReviewItemDetail): string {
  return detail.member !== null ? detail.member.name : `“${detail.listing?.title ?? ''}”`;
}

function poster(detail: ReviewItemDetail): string {
  return detail.listing?.poster.name ?? '';
}

/** The success toast after a decision, naming it and what follows; no undo (ADR 0025). */
export function decidedToast(detail: ReviewItemDetail, decision: ReviewDecision): ToastWords {
  const name = subject(detail);
  switch (detail.kind) {
    case 'new-member':
      return decision === 'remove'
        ? { title: 'Removed', text: `${name} can no longer post or message.` }
        : { title: 'Approved', text: `${name} is now verified.` };
    case 'report':
      return decision === 'remove'
        ? { title: 'Removed', text: `${name} is no longer public, and ${poster(detail)} is told.` }
        : { title: 'Kept', text: `${name} stays public, and its report is closed.` };
    default:
      return decision === 'remove'
        ? { title: 'Removed', text: `${name} won’t be public, and ${poster(detail)} is told.` }
        : { title: 'Approved', text: `${name} is now public on Browse.` };
  }
}

/** The confirmation before Remove, naming what is removed and what follows (L2-020, criterion 9). */
export function confirmRemoveWords(detail: ReviewItemDetail): ConfirmRemoveWords {
  const recorded = 'Your name and the time are recorded.';
  const name = subject(detail);
  switch (detail.kind) {
    case 'new-member':
      return {
        title: `Remove ${name}?`,
        description: `They can no longer sign in, post or message, and their listings stop being public. ${recorded}`,
        confirm: 'Remove member',
        failed: 'The member wasn’t removed.',
      };
    case 'report':
      return {
        title: `Remove ${name}?`,
        description: `The listing stops being public, every open report on it is closed, and ${poster(detail)} is told it was removed. ${recorded}`,
        confirm: 'Remove listing',
        failed: 'The listing wasn’t removed.',
      };
    default:
      return {
        title: `Remove ${name}?`,
        description: `It never becomes public, and ${poster(detail)} is told it was removed. ${recorded}`,
        confirm: 'Remove listing',
        failed: 'The listing wasn’t removed.',
      };
  }
}

/** The danger toast when a decision could not be saved; the item stays (L2-020, criterion 12). */
export function failedDecisionToast(detail: ReviewItemDetail): ToastWords {
  return {
    title: 'Your decision wasn’t saved',
    text: `We couldn’t reach christian.rent. ${subject(detail)} is still in the queue.`,
  };
}

/**
 * Another admin decided first (L2-020, criterion 13): "Another admin approved it at 12:14 p.m."
 * in the panel, and "Another admin approved “…” first." in the toast.
 */
export function alreadyDecidedWords(
  detail: ReviewItemDetail,
  decided: { readonly decision: string; readonly decidedAt: string },
): AlreadyDecidedWords {
  const done = DONE[decided.decision as ReviewDecision] ?? 'decided';
  const notApplied = 'Your decision was not applied.';
  return {
    // The time ends with "a.m." or "p.m.", which ends the sentence.
    panel: `Another admin ${done} it at ${formatTime(new Date(decided.decidedAt))} ${notApplied}`,
    toast: {
      title: 'Already decided',
      text: `Another admin ${done} ${subject(detail)} first. ${notApplied}`,
    },
  };
}
