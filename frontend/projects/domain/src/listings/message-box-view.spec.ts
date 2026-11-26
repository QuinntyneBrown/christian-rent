import { toMessageFormView, toMessageSentView } from './message-box-view';

const NOW = new Date(2026, 5, 8, 14, 50);
const dan = { wanted: false, posterFirstName: 'Dan' };
const marcus = { wanted: true, posterFirstName: 'Marcus' };
const hi = { text: 'Hi Dan', startDate: '2026-06-13', endDate: '2026-06-13' };

// send-message design (cr-message-box by state); ADR 0022; L2-015 criteria 7 to 11.
describe('toMessageFormView', () => {
  it('writes the form of a listing for rent', () => {
    expect(toMessageFormView(dan, hi, {}, 'idle', null, NOW)).toEqual({
      wanted: false,
      submit: 'Message Dan',
      busy: false,
      off: false,
      alert: null,
      summaryTitle: null,
      summary: [],
      startError: null,
      endError: null,
      textError: null,
      datesInWords: 'Sat, Jun 13, 2026 · one day',
      today: '2026-06-08',
      counter: '6 / 1,000',
    });
  });

  it('offers to help with a wanted listing, with no dates in words', () => {
    const view = toMessageFormView(marcus, hi, {}, 'idle', null, NOW);

    expect(view.wanted).toBe(true);
    expect(view.submit).toBe('Offer to help Marcus');
    expect(view.datesInWords).toBeNull();
  });

  it('is busy while the message is sent', () => {
    expect(toMessageFormView(dan, hi, {}, 'submitting', null, NOW).busy).toBe(true);
  });

  it('lists what needs fixing, with each field’s message', () => {
    const errors = {
      endDate: { message: 'The end date is before the start date.', summary: 'Fix the dates' },
      text: { message: 'Write a message of 1 to 1,000 characters.', summary: 'Write a message' },
    };

    const view = toMessageFormView(dan, { ...hi, text: '' }, errors, 'idle', null, NOW);

    expect(view.summaryTitle).toBe('2 things need fixing before this can be sent.');
    expect(view.summary).toEqual([
      { field: 'endDate', text: 'Fix the dates' },
      { field: 'text', text: 'Write a message' },
    ]);
    expect(view.endError).toBe('The end date is before the start date.');
    expect(view.textError).toBe('Write a message of 1 to 1,000 characters.');
    expect(view.startError).toBeNull();
    expect(view.counter).toBe('0 / 1,000');
  });

  it('offers "Try again" after a failure, and says what is kept', () => {
    const view = toMessageFormView(dan, hi, {}, 'failed', null, NOW);

    expect(view.submit).toBe('Try again');
    expect(view.off).toBe(false);
    expect(view.alert).toEqual({
      tone: 'danger',
      title: 'Your message wasn’t sent.',
      text: 'We couldn’t reach christian.rent. Your message and dates are still here.',
    });
    expect(toMessageFormView(marcus, hi, {}, 'failed', null, NOW).alert?.text).toBe(
      'We couldn’t reach christian.rent. Your message is still here.',
    );
  });

  it.each([
    [new Date(2026, 5, 8, 15, 40), 'You can send another at 3:40 p.m.'],
    [new Date(2026, 5, 9, 0, 10), 'You can send another tomorrow at 12:10 a.m.'],
  ])('is off at the limit, naming when sending reopens (%s)', (retryAt, when) => {
    const view = toMessageFormView(dan, hi, {}, 'limited', retryAt.toISOString(), NOW);

    expect(view.submit).toBe('Message Dan');
    expect(view.off).toBe(true);
    expect(view.alert).toEqual({
      tone: 'warning',
      title: 'You’ve sent 20 messages in the last hour.',
      text: `${when} Your message and dates are still here.`,
    });
  });

  it('says "later" when the limit gives no time', () => {
    expect(toMessageFormView(marcus, hi, {}, 'limited', null, NOW).alert?.text).toBe(
      'You can send another later. Your message is still here.',
    );
  });
});

// L2-015 criterion 12; ADR 0022: the dates without their count, then the text in quotation marks.
describe('toMessageSentView', () => {
  it('names the person, says nothing is booked, and quotes the dates and the message', () => {
    expect(
      toMessageSentView('Dan', { text: 'Hi Dan', startDate: '2026-06-13', endDate: '2026-06-13' }),
    ).toEqual({
      title: 'Sent to Dan',
      text: 'Dan can read your message and reply to you. Nothing is booked or paid here; you’ll agree the details together.',
      quote: 'Sat, Jun 13, 2026 · “Hi Dan”',
    });
  });

  it('quotes a range as a card writes it', () => {
    expect(
      toMessageSentView('Dan', { text: 'Hi', startDate: '2026-06-13', endDate: '2026-06-15' })
        .quote,
    ).toBe('Jun 13 to 15, 2026 · “Hi”');
  });

  it('quotes the message alone when it has no dates', () => {
    expect(
      toMessageSentView('Marcus', { text: '<b>Hi</b>', startDate: null, endDate: null }),
    ).toEqual({
      title: 'Sent to Marcus',
      text: 'Marcus can read your message and reply to you. Nothing is booked or paid here; you’ll agree the details together.',
      quote: '“<b>Hi</b>”',
    });
  });
});
