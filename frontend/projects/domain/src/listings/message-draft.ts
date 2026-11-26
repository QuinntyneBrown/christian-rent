import type { MessageDraft, MessageField, SendMessageRequest } from '@rent/api';
import { formatCount } from './format-count';
import { formatDay, formatWhen } from './format-when';

/** A message is at most this many characters, as it is sent. */
export const MESSAGE_LIMIT = 1000;

/** The message box as it opens: nothing written, no dates. */
export const EMPTY_MESSAGE_DRAFT: MessageDraft = { text: '', startDate: '', endDate: '' };

/** The fields that can be invalid, in the order the message box shows them. */
export const MESSAGE_FIELDS: readonly MessageField[] = ['startDate', 'endDate', 'text'];

/** Why a field is invalid: the message under it, and its short entry in the summary. */
export interface MessageError {
  readonly message: string;
  readonly summary: string;
}

/** The error of each invalid field; a valid field has none. */
export type MessageErrors = Partial<Record<MessageField, MessageError>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
// Every control character but a line break and a tab (ADR 0022).
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * A message's text as it is sent and counted (ADR 0022): line endings as `\n`, no control
 * character other than a line break or a tab, in Unicode form C, trimmed.
 */
export function cleanMessageText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL, '').normalize('NFC').trim();
}

/**
 * The rules of a message (send-message design, `MessageDraftValidator`; L2-015, criteria 3 and
 * 4; ADR 0022): text of 1 to 1,000 characters as it is sent; and, for a listing for rent, dates
 * that are optional, but both or neither, the start `today` or later and the end on or after
 * the start. A wanted listing has no dates, so its are not looked at. Every invalid field is
 * named at once.
 */
export function validateMessageDraft(
  draft: MessageDraft,
  listing: { readonly wanted: boolean; readonly today: string },
): MessageErrors {
  const errors: MessageErrors = {};

  if (!listing.wanted && (draft.startDate !== '' || draft.endDate !== '')) {
    const missing = { message: 'Choose a start and an end date.', summary: 'Choose the dates' };
    if (draft.startDate === '') {
      errors.startDate = missing;
    } else if (draft.startDate < listing.today) {
      errors.startDate = {
        message: `The start date is in the past. Choose ${formatDay(listing.today)} or later.`,
        summary: 'Fix the dates',
      };
    }
    if (draft.endDate === '') {
      errors.endDate = missing;
    } else if (draft.startDate !== '' && draft.endDate < draft.startDate) {
      // Both dates are marked, as the invalid mock draws them; a past start keeps its own message.
      errors.endDate = {
        message: `The end date is before the start date. Choose ${formatDay(draft.startDate)} or later.`,
        summary: 'Fix the dates',
      };
      errors.startDate ??= errors.endDate;
    }
  }

  const length = cleanMessageText(draft.text).length;
  if (length < 1 || length > MESSAGE_LIMIT) {
    errors.text = {
      message: 'Write a message of 1 to 1,000 characters.',
      summary: length < 1 ? 'Write a message' : 'Shorten the message',
    };
  }

  return errors;
}

/** The summary's entries: one per invalid field, in the form's order, each text once. */
export function messageSummaryOf(errors: MessageErrors): { field: MessageField; text: string }[] {
  const entries: { field: MessageField; text: string }[] = [];
  for (const field of MESSAGE_FIELDS) {
    const error = errors[field];
    if (error && !entries.some((entry) => entry.text === error.summary)) {
      entries.push({ field, text: error.summary });
    }
  }
  return entries;
}

/** "1 thing needs fixing …" or "2 things need fixing …" (the invalid mock). */
export function messageSummaryTitle(count: number): string {
  return count === 1
    ? '1 thing needs fixing before this can be sent.'
    : `${formatCount(count)} things need fixing before this can be sent.`;
}

/**
 * What is sent for a checked draft: the text cleaned, and both dates or neither; never dates
 * about a wanted listing. A draft is checked by `validateMessageDraft` before it is sent.
 */
export function toMessageRequest(draft: MessageDraft, wanted: boolean): SendMessageRequest {
  const dates = !wanted && draft.startDate !== '' && draft.endDate !== '';
  return {
    text: cleanMessageText(draft.text),
    startDate: dates ? draft.startDate : null,
    endDate: dates ? draft.endDate : null,
  };
}

/**
 * Two dates in words with the days they span, both ends counted (L2-015, criterion 9; ADR
 * 0022): "Sat, Jun 13, 2026 · one day", "Jun 13 to 15, 2026 · 3 days". Null unless both are
 * dates in order.
 */
export function formatDateSpan(start: string, end: string): string | null {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || end < start) {
    return null;
  }
  const words = formatWhen({ text: null, start, end });
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
  return words === null
    ? null
    : `${words} · ${days === 1 ? 'one day' : `${formatCount(days)} days`}`;
}

/** The local calendar date as an ISO date: a start date is compared with the member's own today. */
export function todayOf(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
