import type {
  MessageAlertView,
  MessageDraft,
  MessageFormView,
  MessageSentView,
  SendMessageRequest,
} from '@rent/api';
import { formatCounter } from './format-count';
import { formatRetryAt } from './format-retry-at';
import { formatWhen } from './format-when';
import {
  MESSAGE_LIMIT,
  type MessageErrors,
  cleanMessageText,
  formatDateSpan,
  messageSummaryOf,
  messageSummaryTitle,
  todayOf,
} from './message-draft';

/** Where a message stands (send-message design). A draft with errors is not a state of its own. */
export type MessageState = 'idle' | 'submitting' | 'sent' | 'failed' | 'limited';

/** What the message box needs to know of the listing. */
export interface MessageListing {
  readonly wanted: boolean;
  /** "Dan" for "Pastor Dan Whitaker". */
  readonly posterFirstName: string;
}

/**
 * The form of the message box, every word written (send-message design; ADR 0022; L2-015,
 * criteria 7 to 11; L2-016, criterion 6). The offer decides the button, a failure offers "Try
 * again", and the limit names when sending reopens in the browser's time zone.
 */
export function toMessageFormView(
  listing: MessageListing,
  draft: MessageDraft,
  errors: MessageErrors,
  state: MessageState,
  retryAt: string | null,
  now: Date,
): MessageFormView {
  const summary = messageSummaryOf(errors);
  const submit = listing.wanted
    ? `Offer to help ${listing.posterFirstName}`
    : `Message ${listing.posterFirstName}`;
  return {
    wanted: listing.wanted,
    submit: state === 'failed' ? 'Try again' : submit,
    busy: state === 'submitting',
    off: state === 'limited',
    alert: alertOf(listing, state, retryAt, now),
    summaryTitle: summary.length === 0 ? null : messageSummaryTitle(summary.length),
    summary,
    startError: errors.startDate?.message ?? null,
    endError: errors.endDate?.message ?? null,
    textError: errors.text?.message ?? null,
    datesInWords: listing.wanted ? null : formatDateSpan(draft.startDate, draft.endDate),
    today: todayOf(now),
    counter: formatCounter(cleanMessageText(draft.text).length, MESSAGE_LIMIT),
  };
}

function alertOf(
  listing: MessageListing,
  state: MessageState,
  retryAt: string | null,
  now: Date,
): MessageAlertView | null {
  const kept = listing.wanted
    ? 'Your message is still here.'
    : 'Your message and dates are still here.';
  if (state === 'failed') {
    return {
      tone: 'danger',
      title: 'Your message wasn’t sent.',
      text: `We couldn’t reach christian.rent. ${kept}`,
    };
  }
  if (state === 'limited') {
    // "at 3:40 p.m." today, as the limited mock writes it; "tomorrow at …" past midnight.
    const when = formatRetryAt(retryAt, now).replace(/^today /, '');
    return {
      tone: 'warning',
      title: 'You’ve sent 20 messages in the last hour.',
      text: `You can send another ${when}${when.endsWith('.') ? '' : '.'} ${kept}`,
    };
  }
  return null;
}

/**
 * The confirmation that replaces the form (L2-015, criterion 12): who it went to, that nothing
 * is booked or paid, and the dates and the message quoted back. It never says where the reply
 * arrives. The message is text; the box renders it as text.
 */
export function toMessageSentView(
  posterFirstName: string,
  request: SendMessageRequest,
): MessageSentView {
  const dates = formatWhen({ text: null, start: request.startDate, end: request.endDate });
  const quoted = `“${request.text}”`;
  return {
    title: `Sent to ${posterFirstName}`,
    text: `${posterFirstName} can read your message and reply to you. Nothing is booked or paid here; you’ll agree the details together.`,
    quote: dates === null ? quoted : `${dates} · ${quoted}`,
  };
}
