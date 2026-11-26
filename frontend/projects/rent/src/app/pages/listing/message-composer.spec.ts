import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  type ListingView,
  MESSAGES_API,
  type MessagesApi,
  type SendMessageRequest,
  type SentMessage,
} from '@rent/api';
import { messageDraftKey } from '@rent/domain';
import { MemberGate } from '../../members/member-gate';
import { ListingStore } from './listing-store';
import { MessageComposer } from './message-composer';

const NOW = new Date(2026, 5, 8, 14, 50);
const hall = { wanted: false, posterFirstName: 'Dan' } as ListingView;
const van = { wanted: true, posterFirstName: 'Marcus' } as ListingView;
const hi = { text: ' Hi Dan ', startDate: '2026-06-13', endDate: '2026-06-15' };

/** A MessagesApi whose sends a test answers one at a time. */
class FakeMessagesApi implements MessagesApi {
  readonly calls: {
    listingId: string;
    request: SendMessageRequest;
    signal: AbortSignal;
    resolve: (sent: SentMessage) => void;
    reject: (error: unknown) => void;
  }[] = [];

  send(listingId: string, request: SendMessageRequest, signal: AbortSignal): Promise<SentMessage> {
    return new Promise((resolve, reject) =>
      this.calls.push({ listingId, request, signal, resolve, reject }),
    );
  }
}

function refusal(status: number, code: string | null, retryAt: string | null = null): ApiError {
  return { status, code, retryAt, fields: null };
}

// send-message design (MessageComposer); ADR 0022; L2-015; L2-016 criteria 4 and 6.
describe('MessageComposer', () => {
  let api: FakeMessagesApi;
  let member: boolean;
  let gate: ReturnType<typeof vi.fn>;
  let view: ReturnType<typeof signal<ListingView | null>>;
  let reload: ReturnType<typeof vi.fn>;
  let composer: MessageComposer;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    sessionStorage.clear();
    api = new FakeMessagesApi();
    member = true;
    gate = vi.fn(() => Promise.resolve(member));
    view = signal<ListingView | null>(hall);
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        MessageComposer,
        { provide: MESSAGES_API, useValue: api },
        { provide: MemberGate, useValue: { requireMember: gate } },
        { provide: ListingStore, useValue: { view, load: reload } },
      ],
    });
    composer = TestBed.inject(MessageComposer);
    composer.open('hall');
  });

  afterEach(() => vi.useRealTimers());

  /** Lets the gate answer and the request start. */
  const settle = () => vi.advanceTimersByTimeAsync(0);

  it('has no form until the listing has loaded', () => {
    view.set(null);

    expect(composer.form()).toBeNull();
  });

  it('sends nothing while a field is invalid, and names it from then on', async () => {
    expect(await composer.send()).toBe(false);

    expect(api.calls).toHaveLength(0);
    expect(gate).not.toHaveBeenCalled();
    expect(composer.state()).toBe('idle');
    expect(composer.form()?.summary).toEqual([{ field: 'text', text: 'Write a message' }]);

    composer.change({ ...hi, endDate: '2026-06-12' });
    expect(composer.form()?.summary).toEqual([{ field: 'startDate', text: 'Fix the dates' }]);
    composer.change(hi);
    expect(composer.form()?.summary).toEqual([]);
  });

  it('shows no error before the member has tried to send', () => {
    composer.change({ text: '', startDate: '2026-06-01', endDate: '' });

    expect(composer.form()?.summaryTitle).toBeNull();
  });

  it('compares the start date with today in the member’s own time zone', async () => {
    composer.change({ text: 'Hi', startDate: '2026-06-07', endDate: '2026-06-08' });

    expect(await composer.send()).toBe(false);

    expect(composer.form()?.startError).toBe(
      'The start date is in the past. Choose Jun 8, 2026 or later.',
    );
  });

  it('sends the cleaned message as a member and shows the confirmation', async () => {
    composer.change(hi);

    const sending = composer.send();
    await settle();

    expect(gate).toHaveBeenCalledWith('message');
    expect(composer.state()).toBe('submitting');
    expect(composer.form()?.busy).toBe(true);
    expect(api.calls[0]?.listingId).toBe('hall');
    expect(api.calls[0]?.request).toEqual({
      text: 'Hi Dan',
      startDate: '2026-06-13',
      endDate: '2026-06-15',
    });
    api.calls[0]!.resolve({ id: 'm1', sentAt: '2026-06-08T21:50:00Z' });
    expect(await sending).toBe(true);
    expect(composer.state()).toBe('sent');
    expect(composer.sent()).toEqual({
      title: 'Sent to Dan',
      text: 'Dan can read your message and reply to you. Nothing is booked or paid here; you’ll agree the details together.',
      quote: 'Jun 13 to 15, 2026 · “Hi Dan”',
    });
  });

  it('sends no dates about a wanted listing', async () => {
    view.set(van);
    composer.change({ ...hi, endDate: '2026-06-01' });

    void composer.send();
    await settle();

    expect(api.calls[0]?.request).toEqual({ text: 'Hi Dan', startDate: null, endDate: null });
  });

  it('ignores a second send and any change while a message is being sent', async () => {
    composer.change(hi);
    void composer.send();
    await settle();

    await composer.send();
    composer.change({ ...hi, text: 'Changed' });
    await settle();

    expect(api.calls).toHaveLength(1);
    expect(composer.draft()).toEqual(hi);
  });

  it('sends nothing for a person who does not become a member, and keeps the draft', async () => {
    member = false;
    composer.change(hi);

    expect(await composer.send()).toBe(true);

    expect(api.calls).toHaveLength(0);
    expect(composer.state()).toBe('idle');
    expect(composer.draft()).toEqual(hi);
  });

  it('keeps the draft in sessionStorage on every change and restores it when the listing opens', () => {
    composer.change(hi);

    expect(sessionStorage.getItem(messageDraftKey('hall'))).toBe(JSON.stringify(hi));
    composer.open('van');
    expect(composer.draft()).toEqual({ text: '', startDate: '', endDate: '' });
    composer.open('hall');
    expect(composer.draft()).toEqual(hi);
  });

  it('clears the kept draft once the message is sent', async () => {
    composer.change(hi);
    const sending = composer.send();
    await settle();
    api.calls[0]!.resolve({ id: 'm1', sentAt: '2026-06-08T21:50:00Z' });
    await sending;

    expect(sessionStorage.getItem(messageDraftKey('hall'))).toBeNull();
    expect(composer.draft()).toEqual({ text: '', startDate: '', endDate: '' });
  });

  it.each([
    ['christian.rent cannot be reached', refusal(0, null)],
    ['the write limit', refusal(429, 'rate_limited', '2026-06-08T21:51:00Z')],
    ['the backend’s rules differ', refusal(400, 'validation_failed')],
    ['the listing turns out to be one’s own', refusal(403, 'own_listing')],
  ])('keeps the draft and offers "Try again" when %s', async (_, error) => {
    composer.change(hi);
    const sending = composer.send();
    await settle();

    api.calls[0]!.reject(error);
    await sending;

    expect(composer.state()).toBe('failed');
    expect(composer.form()?.submit).toBe('Try again');
    expect(composer.draft()).toEqual(hi);
    expect(sessionStorage.getItem(messageDraftKey('hall'))).toBe(JSON.stringify(hi));

    void composer.send();
    await settle();
    expect(api.calls).toHaveLength(2);
    expect(composer.form()?.alert).toBeNull();
  });

  it('is off at the messaging limit, keeps the draft, and reopens when the limit lifts', async () => {
    composer.change(hi);
    const sending = composer.send();
    await settle();

    api.calls[0]!.reject(
      refusal(429, 'message_limit_reached', new Date(2026, 5, 8, 15, 40).toISOString()),
    );
    await sending;

    expect(composer.state()).toBe('limited');
    expect(composer.form()?.off).toBe(true);
    expect(composer.form()?.alert?.text).toBe(
      'You can send another at 3:40 p.m. Your message and dates are still here.',
    );
    expect(composer.draft()).toEqual(hi);
    await composer.send();
    expect(api.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(50 * 60 * 1000 - 1);
    expect(composer.state()).toBe('limited');
    await vi.advanceTimersByTimeAsync(1);
    expect(composer.state()).toBe('idle');
    expect(composer.form()?.alert).toBeNull();
    expect(composer.draft()).toEqual(hi);
  });

  it('reloads the listing when it was taken down, and keeps the draft', async () => {
    composer.change(hi);
    const sending = composer.send();
    await settle();

    api.calls[0]!.reject(refusal(404, 'not_found'));
    await sending;

    expect(reload).toHaveBeenCalledOnce();
    expect(composer.state()).toBe('idle');
    expect(sessionStorage.getItem(messageDraftKey('hall'))).toBe(JSON.stringify(hi));
  });

  it('aborts a message in flight and clears the limit’s timer when the member leaves', async () => {
    composer.change(hi);
    void composer.send();
    await settle();

    TestBed.resetTestingModule();

    expect(api.calls[0]?.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind when it is destroyed at the limit', async () => {
    composer.change(hi);
    const sending = composer.send();
    await settle();
    api.calls[0]!.reject(refusal(429, 'message_limit_reached', '2026-06-08T23:00:00Z'));
    await sending;
    expect(vi.getTimerCount()).toBe(1);

    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the message of the listing it leaves when another opens', async () => {
    composer.change(hi);
    void composer.send();
    await settle();

    composer.open('van');

    expect(api.calls[0]?.signal.aborted).toBe(true);
    expect(composer.state()).toBe('idle');
  });
});
