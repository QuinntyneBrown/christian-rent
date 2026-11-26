import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MessageDraft, MessageFormView } from '@rent/api';
import { MessageBox } from './message-box';

const price = { eyebrow: 'Rent for', amount: '$45', unit: 'CAD / hour' };
const draft: MessageDraft = { text: 'Hi Dan', startDate: '2026-06-13', endDate: '2026-06-13' };
const form: MessageFormView = {
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
};

function render(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(MessageBox);
  const all = { heading: 'Message Dan about this listing', price, draft, ...inputs };
  for (const [name, value] of Object.entries(all)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const text = (selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, element, text };
}

// docs/design-system/components/message-box.html; docs/mocks/pages/listing; L2-015.
describe('MessageBox', () => {
  it('draws the price, the dates, the message with its counter, the button and the fine print', () => {
    const { element, text } = render({ form });

    expect(text('h2.visually-hidden')).toBe('Message Dan about this listing');
    expect(element.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      element.querySelector('h2')?.id,
    );
    expect(text('.message-box__eyebrow')).toBe('Rent for');
    expect(text('.message-box__price')).toBe('$45 CAD / hour');
    expect(text('fieldset legend.visually-hidden')).toBe('Dates');
    const [start, end] = [...element.querySelectorAll<HTMLInputElement>('input[type="date"]')];
    expect([start?.value, start?.min, end?.value]).toEqual([
      '2026-06-13',
      '2026-06-08',
      '2026-06-13',
    ]);
    expect(text('.date-range__summary')).toBe('Sat, Jun 13, 2026 · one day');
    const textarea = element.querySelector('textarea')!;
    expect([textarea.value, textarea.getAttribute('maxlength'), textarea.rows]).toEqual([
      'Hi Dan',
      '1000',
      4,
    ]);
    expect(text('.field__counter')).toBe('6 / 1,000');
    const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.textContent?.trim()).toBe('Message Dan');
    expect(button.classList.contains('btn--rent')).toBe(true);
    expect(button.classList.contains('btn--block')).toBe(true);
    expect(text('.message-box__fine')).toBe(
      'No payment happens here. You’ll agree the details together.',
    );
    expect(element.querySelector('.alert')).toBeNull();
  });

  it('has no dates and a blue button for a wanted listing, and no head without a price', () => {
    const { element } = render({
      price: null,
      form: { ...form, wanted: true, submit: 'Offer to help Marcus', datesInWords: null },
    });

    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('.message-box__eyebrow')).toBeNull();
    expect(element.querySelector('.message-box__price')).toBeNull();
    const button = element.querySelector('button[type="submit"]')!;
    expect(button.classList.contains('btn--wanted')).toBe(true);
    expect(button.textContent?.trim()).toBe('Offer to help Marcus');
    expect(element.querySelector('form')?.classList).toContain('message-box__form--first');
  });

  it('emits the draft with what was typed or chosen, and never changes it itself', () => {
    const { fixture, element } = render({ form });
    const drafts: MessageDraft[] = [];
    fixture.componentInstance.draftChange.subscribe((value) => drafts.push(value));
    const textarea = element.querySelector('textarea')!;
    const end = element.querySelectorAll<HTMLInputElement>('input[type="date"]')[1]!;

    textarea.value = 'Hi Dan!';
    textarea.dispatchEvent(new Event('input'));
    end.value = '2026-06-15';
    end.dispatchEvent(new Event('input'));

    expect(drafts).toEqual([
      { ...draft, text: 'Hi Dan!' },
      { ...draft, endDate: '2026-06-15' },
    ]);
  });

  it('emits send when the form is submitted, and not while busy or off', () => {
    const { fixture, element } = render({ form });
    let sends = 0;
    fixture.componentInstance.send.subscribe(() => sends++);
    const submit = () =>
      element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(submit()).toBe(false);
    fixture.componentRef.setInput('form', { ...form, busy: true });
    fixture.detectChanges();
    submit();
    fixture.componentRef.setInput('form', { ...form, off: true });
    fixture.detectChanges();
    submit();

    expect(sends).toBe(1);
  });

  it('marks invalid fields, lists them in a summary that takes focus, and links to each', () => {
    const { fixture, element, text } = render({
      draft: { text: '', startDate: '2026-06-13', endDate: '2026-06-12' },
      form: {
        ...form,
        summaryTitle: '2 things need fixing before this can be sent.',
        summary: [
          { field: 'startDate', text: 'Fix the dates' },
          { field: 'text', text: 'Write a message' },
        ],
        startError: 'The end date is before the start date. Choose Jun 13, 2026 or later.',
        endError: 'The end date is before the start date. Choose Jun 13, 2026 or later.',
        textError: 'Write a message of 1 to 1,000 characters.',
        datesInWords: null,
      },
    });
    document.body.append(element);

    expect(text('.form-summary .alert__title')).toBe(
      '2 things need fixing before this can be sent.',
    );
    const links = [...element.querySelectorAll<HTMLAnchorElement>('.form-summary a')];
    expect(links.map((link) => link.textContent)).toEqual(['Fix the dates', 'Write a message']);
    const dates = [...element.querySelectorAll('input[type="date"]')];
    expect(dates.map((input) => input.getAttribute('aria-invalid'))).toEqual(['true', 'true']);
    const textarea = element.querySelector('textarea')!;
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelectorAll('.field__error')).toHaveLength(2);

    fixture.componentInstance.focusSummary();
    expect(document.activeElement).toBe(element.querySelector('.form-summary'));
    links[1]!.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true }));
    expect(document.activeElement).toBe(textarea);
    links[0]!.click();
    expect(document.activeElement).toBe(dates[0]);
    element.remove();
  });

  it('is busy: the form and the button say so, and the fields are read-only', () => {
    const { element } = render({ form: { ...form, busy: true } });

    expect(element.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('textarea')?.readOnly).toBe(true);
    expect(
      [...element.querySelectorAll<HTMLInputElement>('input')].map((input) => input.readOnly),
    ).toEqual([true, true]);
  });

  it('announces a failure and offers "Try again"', () => {
    const { element, text } = render({
      form: {
        ...form,
        submit: 'Try again',
        alert: {
          tone: 'danger',
          title: 'Your message wasn’t sent.',
          text: 'We couldn’t reach christian.rent. Your message and dates are still here.',
        },
      },
    });

    const alert = element.querySelector('.alert')!;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.classList.contains('alert--danger')).toBe(true);
    expect(text('.alert__title')).toBe('Your message wasn’t sent.');
    expect(text('button[type="submit"]')).toBe('Try again');
    expect(element.querySelector('textarea')?.value).toBe('Hi Dan');
  });

  it('turns the button off at the limit, with a warning that says when', () => {
    const { element, text } = render({
      form: {
        ...form,
        off: true,
        alert: {
          tone: 'warning',
          title: 'You’ve sent 20 messages in the last hour.',
          text: 'You can send another at 3:40 p.m. Your message and dates are still here.',
        },
      },
    });

    expect(element.querySelector('.alert')?.classList.contains('alert--warning')).toBe(true);
    expect(text('.alert__text')).toBe(
      'You can send another at 3:40 p.m. Your message and dates are still here.',
    );
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('replaces the form with its confirmation, quoting the message as text', () => {
    const { fixture, element, text } = render({
      form,
      sent: {
        title: 'Sent to Dan',
        text: 'Dan can read your message and reply to you.',
        quote: 'Sat, Jun 13, 2026 · “<b>Hi</b>\nDan”',
      },
    });
    document.body.append(element);

    expect(element.querySelector('form')).toBeNull();
    const status = element.querySelector('.message-box__sent')!;
    expect(status.getAttribute('role')).toBe('status');
    expect(text('h2.message-box__sent-title')).toBe('Sent to Dan');
    expect(element.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      element.querySelector('h2')?.id,
    );
    expect(text('.message-box__sent-text')).toBe('Dan can read your message and reply to you.');
    const quote = element.querySelector('blockquote.message-box__quote')!;
    expect(quote.textContent).toBe('Sat, Jun 13, 2026 · “<b>Hi</b>\nDan”');
    expect(quote.querySelector('b')).toBeNull();
    const back = element.querySelector('a')!;
    expect([back.textContent?.trim(), back.getAttribute('href')]).toEqual([
      'Back to all listings',
      '/',
    ]);

    fixture.componentInstance.focusSent();
    expect(document.activeElement).toBe(element.querySelector('h2'));
    element.remove();
  });

  it('says "This is your listing." with the price and no form on the member’s own', () => {
    const { element, text } = render({ own: true, form });

    expect(element.querySelector('form')).toBeNull();
    expect(text('.message-box__price')).toBe('$45 CAD / hour');
    expect(text('h2.message-box__sent-title')).toBe('This is your listing.');
    expect(text('.message-box__sent-text')).toBe(
      'Members who are interested send you a message from here.',
    );
  });

  it('is a skeleton while the listing loads, and nothing without a form', () => {
    expect(
      render({ loading: true }).element.querySelector('.message-box')?.getAttribute('aria-hidden'),
    ).toBe('true');
    TestBed.resetTestingModule();
    expect(render().element.querySelector('.message-box')).toBeNull();
  });
});
