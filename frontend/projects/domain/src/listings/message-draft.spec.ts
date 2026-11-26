import type { MessageDraft } from '@rent/api';
import {
  cleanMessageText,
  formatDateSpan,
  messageSummaryOf,
  messageSummaryTitle,
  toMessageRequest,
  todayOf,
  validateMessageDraft,
} from './message-draft';

const TODAY = '2026-06-08';

function draft(text: string, startDate = '', endDate = ''): MessageDraft {
  return { text, startDate, endDate };
}

// send-message design (validateMessageDraft); ADR 0022; L2-015 criteria 3, 4 and 10.
describe('validateMessageDraft', () => {
  const rent = { wanted: false, today: TODAY };

  it.each([
    ['a message with no dates', draft('Hi')],
    ['a message of 1,000 characters once trimmed', draft(`  ${'a'.repeat(1000)}  `)],
    ['one day, today', draft('Hi', TODAY, TODAY)],
    ['a range', draft('Hi', '2026-06-13', '2026-06-15')],
  ])('accepts %s', (_, value) => {
    expect(validateMessageDraft(value, rent)).toEqual({});
  });

  it.each([
    ['an empty message', draft(''), 'Write a message'],
    ['a message of spaces and line breaks', draft(' \n '), 'Write a message'],
    ['a message of 1,001 characters', draft('a'.repeat(1001)), 'Shorten the message'],
  ])('refuses %s', (_, value, summary) => {
    expect(validateMessageDraft(value, rent)).toEqual({
      text: { message: 'Write a message of 1 to 1,000 characters.', summary },
    });
  });

  it('refuses an end date before the start date on both dates, naming the date to choose', () => {
    const error = {
      message: 'The end date is before the start date. Choose Jun 13, 2026 or later.',
      summary: 'Fix the dates',
    };

    expect(validateMessageDraft(draft('Hi', '2026-06-13', '2026-06-12'), rent)).toEqual({
      startDate: error,
      endDate: error,
    });
  });

  it('refuses a start date in the past, naming today', () => {
    expect(validateMessageDraft(draft('Hi', '2026-06-07', '2026-06-09'), rent)).toEqual({
      startDate: {
        message: 'The start date is in the past. Choose Jun 8, 2026 or later.',
        summary: 'Fix the dates',
      },
    });
  });

  it.each([
    ['a start with no end', draft('Hi', '2026-06-13', ''), 'endDate'],
    ['an end with no start', draft('Hi', '', '2026-06-13'), 'startDate'],
  ])('refuses %s', (_, value, field) => {
    expect(validateMessageDraft(value, rent)).toEqual({
      [field]: { message: 'Choose a start and an end date.', summary: 'Choose the dates' },
    });
  });

  it('ignores dates on a wanted listing, which has none', () => {
    expect(
      validateMessageDraft(draft('Hi', '2026-06-13', '2026-06-12'), { wanted: true, today: TODAY }),
    ).toEqual({});
  });

  it('names every invalid field at once, in the form’s order, each text once', () => {
    const errors = validateMessageDraft(draft('', '2026-06-07', '2026-06-06'), rent);

    expect(messageSummaryOf(errors)).toEqual([
      { field: 'startDate', text: 'Fix the dates' },
      { field: 'text', text: 'Write a message' },
    ]);
  });
});

describe('messageSummaryTitle', () => {
  it.each([
    [1, '1 thing needs fixing before this can be sent.'],
    [2, '2 things need fixing before this can be sent.'],
  ])('%i', (count, title) => {
    expect(messageSummaryTitle(count)).toBe(title);
  });
});

// ADR 0022: line endings as \n, no control character but a line break or a tab, form C, trimmed.
describe('cleanMessageText', () => {
  it.each([
    ['  Hi Dan  ', 'Hi Dan'],
    ['One\r\nTwo\rThree', 'One\nTwo\nThree'],
    ['Bell\u0007 and\ttab', 'Bell and\ttab'],
    ['Café', 'Café'],
    ['\n\n', ''],
  ])('%j', (typed, cleaned) => {
    expect(cleanMessageText(typed)).toBe(cleaned);
  });
});

describe('toMessageRequest', () => {
  it('sends the cleaned text and both dates of a listing for rent', () => {
    expect(toMessageRequest(draft(' Hi \r\n there ', '2026-06-13', '2026-06-15'), false)).toEqual({
      text: 'Hi \n there',
      startDate: '2026-06-13',
      endDate: '2026-06-15',
    });
  });

  it('sends no dates when none were chosen', () => {
    expect(toMessageRequest(draft('Hi'), false)).toEqual({
      text: 'Hi',
      startDate: null,
      endDate: null,
    });
  });

  it('never sends dates about a wanted listing', () => {
    expect(toMessageRequest(draft('Hi', '2026-06-13', '2026-06-15'), true)).toEqual({
      text: 'Hi',
      startDate: null,
      endDate: null,
    });
  });
});

// L2-015 criterion 9; ADR 0022: the dates in words with the days they span, both ends counted.
describe('formatDateSpan', () => {
  it.each([
    ['2026-06-13', '2026-06-13', 'Sat, Jun 13, 2026 · one day'],
    ['2026-06-13', '2026-06-14', 'Jun 13 to 14, 2026 · 2 days'],
    ['2026-06-13', '2026-06-15', 'Jun 13 to 15, 2026 · 3 days'],
    ['2026-06-29', '2026-07-02', 'Jun 29 to Jul 2, 2026 · 4 days'],
    ['2026-12-30', '2027-01-02', 'Dec 30, 2026 to Jan 2, 2027 · 4 days'],
    ['2026-03-07', '2026-03-09', 'Mar 7 to 9, 2026 · 3 days'],
  ])('%s to %s', (start, end, words) => {
    expect(formatDateSpan(start, end)).toBe(words);
  });

  it.each([
    ['', ''],
    ['2026-06-13', ''],
    ['2026-06-13', '2026-06-12'],
    ['not-a-date', '2026-06-12'],
  ])('says nothing for %j to %j', (start, end) => {
    expect(formatDateSpan(start, end)).toBeNull();
  });
});

describe('todayOf', () => {
  it('is the local calendar date, not the UTC one', () => {
    expect(todayOf(new Date(2026, 5, 8, 23, 59))).toBe('2026-06-08');
    expect(todayOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
