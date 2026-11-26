import { type ListingDraft, newDraft } from './listing-draft';
import { parsePrice, summaryOf, summaryTitle, validateDraft } from './draft-validator';

const valid: ListingDraft = {
  ...newDraft('id-1'),
  title: 'Pressure washer and drill kit',
  price: '25',
  whenText: 'Most weekends',
  area: 'Willoughby, Langley',
  note: 'Pick up from my garage.',
};
const wanted: ListingDraft = { ...valid, offer: 'wanted', price: '120' };
const dates: ListingDraft = {
  ...valid,
  whenMode: 'dates',
  startDate: '2026-07-14',
  endDate: '2026-07-18',
};
const text = (length: number) => `  ${'é'.repeat(length)} `;

// The rules of the compose-listing design (L2-010 criteria 1 to 7, 11, 12 and 14), one case per
// row: each changes one field of a valid listing for rent, and gives the error it makes, or none.
describe('validateDraft', () => {
  it.each<[string, ListingDraft, Record<string, [string, string]>]>([
    ['a valid listing for rent', valid, {}],
    ['a valid wanted listing', wanted, {}],
    [
      'a title of 2',
      { ...valid, title: text(2) },
      { title: ['A title is 3 to 80 characters. This one is 2.', 'Make the title longer'] },
    ],
    [
      'an empty title',
      { ...valid, title: '   ' },
      { title: ['A title is 3 to 80 characters. This one is 0.', 'Make the title longer'] },
    ],
    ['a title of 3', { ...valid, title: text(3) }, {}],
    ['a title of 80', { ...valid, title: text(80) }, {}],
    [
      'a title of 81',
      { ...valid, title: text(81) },
      { title: ['A title is 3 to 80 characters. This one is 81.', 'Make the title shorter'] },
    ],
    [
      'no price for rent',
      { ...valid, price: ' ' },
      { price: ['Enter a price. Enter 0 to offer it free.', 'Give a price'] },
    ],
    ['no price wanted', { ...wanted, price: '' }, {}],
    ['a price of 0', { ...valid, price: '0' }, {}],
    ['a price with cents and a separator', { ...valid, price: '$1,250.50' }, {}],
    ['a price of 100,000', { ...valid, price: '100000' }, {}],
    [
      'a price over 100,000',
      { ...valid, price: '100000.01' },
      {
        price: ['A price is between $0 and $100,000. Enter 0 to offer it free.', 'Lower the price'],
      },
    ],
    [
      'a negative price',
      { ...valid, price: '-5' },
      { price: ['Enter a price in dollars, such as 25 or 25.50.', 'Fix the price'] },
    ],
    [
      'a price with 3 decimals',
      { ...valid, price: '25.125' },
      { price: ['Enter a price in dollars, such as 25 or 25.50.', 'Fix the price'] },
    ],
    [
      'a price in words',
      { ...valid, price: 'twenty' },
      { price: ['Enter a price in dollars, such as 25 or 25.50.', 'Fix the price'] },
    ],
    [
      'a budget in words',
      { ...wanted, price: 'lots' },
      { price: ['Enter a budget in dollars, such as 120 or 120.50.', 'Fix the budget'] },
    ],
    [
      'a budget over 100,000',
      { ...wanted, price: '100001' },
      { price: ['A budget is up to $100,000.', 'Lower the budget'] },
    ],
    [
      'no "when" for rent',
      { ...valid, whenText: ' ' },
      { whenText: ['Say when it’s available, such as “Most weekends”.', 'Say when'] },
    ],
    [
      'no "when" wanted',
      { ...wanted, whenText: '' },
      { whenText: ['Say when you need it, such as “Weekday evenings”.', 'Say when'] },
    ],
    ['"when" of 80', { ...valid, whenText: text(80) }, {}],
    [
      '"when" of 81',
      { ...valid, whenText: text(81) },
      { whenText: ['Describe when in 80 characters or fewer.', 'Shorten when'] },
    ],
    ['dates', dates, {}],
    ['dates on one day', { ...dates, endDate: '2026-07-14' }, {}],
    ['dates in the past', { ...dates, startDate: '2020-01-01', endDate: '2020-01-02' }, {}],
    ['dates, words left in "when"', { ...dates, whenText: '' }, {}],
    [
      'no start date',
      { ...dates, startDate: '' },
      { startDate: ['Choose a start and an end date.', 'Choose the dates'] },
    ],
    [
      'no end date',
      { ...dates, endDate: '' },
      { endDate: ['Choose a start and an end date.', 'Choose the dates'] },
    ],
    [
      'an end before the start',
      { ...dates, endDate: '2026-07-13' },
      { endDate: ['The end date is before the start date.', 'Fix the dates'] },
    ],
    [
      'no area',
      { ...valid, area: ' ' },
      {
        area: [
          'Enter a city or neighbourhood in Canada, such as “Willoughby, Langley”.',
          'Say where it is',
        ],
      },
    ],
    ['an area of 80', { ...valid, area: text(80) }, {}],
    [
      'an area of 81',
      { ...valid, area: text(81) },
      { area: ['Describe where in 80 characters or fewer.', 'Shorten where'] },
    ],
    ['no note', { ...valid, note: '' }, {}],
    ['a note of 1,000', { ...valid, note: `\n${'é'.repeat(1000)}\n` }, {}],
    [
      'a note of 1,001',
      { ...valid, note: 'é'.repeat(1001) },
      { note: ['A note is 1,000 characters or fewer. This one is 1,001.', 'Shorten the note'] },
    ],
  ])('%s', (_, draft, expected) => {
    const errors = Object.fromEntries(
      Object.entries(validateDraft(draft)).map(([field, error]) => [
        field,
        [error.message, error.summary],
      ]),
    );

    expect(errors).toEqual(expected);
  });
});

describe('parsePrice', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['25', 25],
    ['25.5', 25.5],
    ['$1,250.50', 1250.5],
    ['1 250', 1250],
    ['.5', undefined],
    ['25.', undefined],
    ['-1', undefined],
    ['1e3', undefined],
  ] as const)('reads "%s" as %s', (typed, amount) => {
    expect(parsePrice(typed)).toBe(amount);
  });
});

describe('summaryOf', () => {
  // L2-010 criterion 8: one entry per field, in the order of the form, each named once.
  it('lists one entry per field in the form’s order, and "Choose the dates" once', () => {
    const errors = validateDraft({ ...dates, title: 'PW', startDate: '', endDate: '', area: '' });

    expect(summaryOf(errors)).toEqual([
      { field: 'title', text: 'Make the title longer' },
      { field: 'startDate', text: 'Choose the dates' },
      { field: 'area', text: 'Say where it is' },
    ]);
  });

  it.each([
    [1, '1 thing needs fixing before this can be posted.'],
    [3, '3 things need fixing before this can be posted.'],
  ])('titles a summary of %i', (count, title) => {
    expect(summaryTitle(count)).toBe(title);
  });
});
