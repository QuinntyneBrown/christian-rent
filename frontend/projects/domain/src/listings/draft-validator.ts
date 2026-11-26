import { formatCount } from './format-count';
import { DRAFT_LIMITS, type ListingDraft } from './listing-draft';

/** The fields of a draft that can be invalid, in the order Post shows them. */
export type DraftField = 'title' | 'price' | 'whenText' | 'startDate' | 'endDate' | 'area' | 'note';

export const DRAFT_FIELDS: readonly DraftField[] = [
  'title',
  'price',
  'whenText',
  'startDate',
  'endDate',
  'area',
  'note',
];

/** Why a field is invalid: the message under it, and its short entry in the summary. */
export interface DraftError {
  readonly message: string;
  readonly summary: string;
}

/** The error of each invalid field; a valid field has none. */
export type DraftErrors = Partial<Record<DraftField, DraftError>>;

const MIN_TITLE = 3;
const MAX_PRICE = 100_000;
const PRICE = /^\d+(\.\d{1,2})?$/;

/**
 * The rules of a listing (compose-listing design, `ListingDraftValidator`; L2-010): a title of
 * 3 to 80 characters; a price of 0 to 100,000 dollars with at most two decimals, required for
 * rent and optional when wanted; "when" in words of up to 80 characters, or a start and an end
 * date in order; an area of up to 80; a note of up to 1,000. Lengths count the text as it is
 * sent. Every invalid field is named at once.
 */
export function validateDraft(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};
  const wanted = draft.offer === 'wanted';

  const title = oneLine(draft.title).length;
  if (title < MIN_TITLE || title > DRAFT_LIMITS.title) {
    errors.title = {
      message: `A title is 3 to 80 characters. This one is ${formatCount(title)}.`,
      summary: title < MIN_TITLE ? 'Make the title longer' : 'Make the title shorter',
    };
  }

  const price = parsePrice(draft.price);
  if (price === null && !wanted) {
    errors.price = { message: 'Enter a price. Enter 0 to offer it free.', summary: 'Give a price' };
  } else if (price === undefined) {
    errors.price = wanted
      ? { message: 'Enter a budget in dollars, such as 120 or 120.50.', summary: 'Fix the budget' }
      : { message: 'Enter a price in dollars, such as 25 or 25.50.', summary: 'Fix the price' };
  } else if (price !== null && price > MAX_PRICE) {
    errors.price = wanted
      ? { message: 'A budget is up to $100,000.', summary: 'Lower the budget' }
      : {
          message: 'A price is between $0 and $100,000. Enter 0 to offer it free.',
          summary: 'Lower the price',
        };
  }

  if (draft.whenMode === 'text') {
    const when = oneLine(draft.whenText).length;
    if (when === 0) {
      errors.whenText = {
        message: wanted
          ? 'Say when you need it, such as “Weekday evenings”.'
          : 'Say when it’s available, such as “Most weekends”.',
        summary: 'Say when',
      };
    } else if (when > DRAFT_LIMITS.whenText) {
      errors.whenText = {
        message: 'Describe when in 80 characters or fewer.',
        summary: 'Shorten when',
      };
    }
  } else {
    const missing = { message: 'Choose a start and an end date.', summary: 'Choose the dates' };
    if (draft.startDate === '') {
      errors.startDate = missing;
    }
    if (draft.endDate === '') {
      errors.endDate = missing;
    } else if (draft.startDate !== '' && draft.endDate < draft.startDate) {
      errors.endDate = {
        message: 'The end date is before the start date.',
        summary: 'Fix the dates',
      };
    }
  }

  const area = oneLine(draft.area).length;
  if (area === 0) {
    errors.area = {
      message: 'Enter a city or neighbourhood in Canada, such as “Willoughby, Langley”.',
      summary: 'Say where it is',
    };
  } else if (area > DRAFT_LIMITS.area) {
    errors.area = {
      message: 'Describe where in 80 characters or fewer.',
      summary: 'Shorten where',
    };
  }

  const note = draft.note.trim().length;
  if (note > DRAFT_LIMITS.note) {
    errors.note = {
      message: `A note is 1,000 characters or fewer. This one is ${formatCount(note)}.`,
      summary: 'Shorten the note',
    };
  }

  return errors;
}

/**
 * A price as typed: null when empty, undefined when it is not a number of dollars with at most
 * two decimals. A leading "$", commas and spaces are ignored.
 */
export function parsePrice(typed: string): number | null | undefined {
  const text = typed.replace(/[\s,]/g, '').replace(/^\$/, '');
  if (text === '') {
    return null;
  }
  return PRICE.test(text) ? Number(text) : undefined;
}

/** The summary's entries: one per invalid field, in the form's order, each text once. */
export function summaryOf(errors: DraftErrors): { field: DraftField; text: string }[] {
  const entries: { field: DraftField; text: string }[] = [];
  for (const field of DRAFT_FIELDS) {
    const error = errors[field];
    if (error && !entries.some((entry) => entry.text === error.summary)) {
      entries.push({ field, text: error.summary });
    }
  }
  return entries;
}

/** "1 thing needs fixing …" or "3 things need fixing …" (the invalid mock). */
export function summaryTitle(count: number): string {
  return count === 1
    ? '1 thing needs fixing before this can be posted.'
    : `${formatCount(count)} things need fixing before this can be posted.`;
}

/** One line of text as it is sent: Unicode form C, trimmed, runs of space made one. */
export function oneLine(text: string): string {
  return text.normalize('NFC').trim().split(/\s+/).filter(Boolean).join(' ');
}
