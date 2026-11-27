import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  MESSAGES_API,
  type MessageDraft,
  type MessageFormView,
  type MessageSentView,
  isApiError,
} from '@rent/api';
import {
  EMPTY_MESSAGE_DRAFT,
  MessageDraftStore,
  type MessageState,
  toMessageFormView,
  toMessageRequest,
  toMessageSentView,
  todayOf,
  validateMessageDraft,
  sessionStorageOf,
} from '@rent/domain';
import { MemberGate } from '../../members/member-gate';
import { ListingStore } from './listing-store';

/** The longest a timer waits; the messaging limit reopens within the hour (ADR 0022). */
const MAX_WAIT_MS = 60 * 60 * 1000;

/**
 * The message a member writes on the Listing screen, provided by the page and gone when the
 * person leaves it (send-message design; ADR 0022): the draft, its errors once the member has
 * tried to send, and where sending stands. The draft is written to `sessionStorage` on every
 * change and read back when the listing opens, so it survives the join dialog and a reload
 * (L2-015, criteria 5 and 14). A failed or limited send keeps it (criterion 7; L2-016,
 * criterion 6). Leaving aborts a message in flight and clears the limit's timer.
 */
@Injectable()
export class MessageComposer {
  private readonly api = inject(MESSAGES_API);
  private readonly gate = inject(MemberGate);
  private readonly listing = inject(ListingStore);
  private readonly drafts = new MessageDraftStore(sessionStorageOf(inject(DOCUMENT)));

  private listingId: string | null = null;
  private request: AbortController | null = null;
  private reopenTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly current = signal<MessageDraft>(EMPTY_MESSAGE_DRAFT);
  /** Set once the member tries to send; from then on errors follow every change. */
  private readonly checked = signal(false);
  private readonly _state = signal<MessageState>('idle');
  private readonly retryAt = signal<string | null>(null);
  private readonly _sent = signal<MessageSentView | null>(null);

  readonly draft = this.current.asReadonly();
  readonly state = this._state.asReadonly();
  /** The confirmation, once the message is sent (L2-015, criterion 12). */
  readonly sent = this._sent.asReadonly();

  private readonly errors = computed(() => {
    const view = this.listing.view();
    return this.checked() && view
      ? validateMessageDraft(this.current(), { wanted: view.wanted, today: todayOf(new Date()) })
      : {};
  });

  /** The form as the message box draws it; null until the listing has loaded. */
  readonly form = computed<MessageFormView | null>(() => {
    const view = this.listing.view();
    return view
      ? toMessageFormView(
          view,
          this.current(),
          this.errors(),
          this._state(),
          this.retryAt(),
          new Date(),
        )
      : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  /** A listing opens: its kept draft comes back, and nothing is checked or sent yet. */
  open(listingId: string): void {
    this.release();
    this.listingId = listingId;
    this.current.set(this.drafts.restore(listingId) ?? EMPTY_MESSAGE_DRAFT);
    this.checked.set(false);
    this.retryAt.set(null);
    this._sent.set(null);
    this._state.set('idle');
  }

  /** What the member typed or chose; it is kept at once. */
  change(draft: MessageDraft): void {
    if (this._state() === 'submitting' || this._state() === 'sent') {
      return;
    }
    this.current.set(draft);
    if (this.listingId !== null) {
      this.drafts.save(this.listingId, draft);
    }
  }

  /**
   * Sends the draft once it is valid and the person is a member (L2-015, criteria 1 and 5).
   * It answers false when a field is invalid, so the page can move focus to the summary. While
   * a message is sent, or the limit holds, a second call does nothing (criterion 11).
   */
  async send(): Promise<boolean> {
    const view = this.listing.view();
    const listingId = this.listingId;
    if (
      !view ||
      listingId === null ||
      this._state() === 'submitting' ||
      this._state() === 'limited'
    ) {
      return true;
    }
    this.checked.set(true);
    if (Object.keys(this.errors()).length > 0) {
      this._state.set('idle');
      return false;
    }
    this._state.set('submitting');
    const request = new AbortController();
    this.request = request;
    try {
      if (!(await this.gate.requireMember('message')) || request.signal.aborted) {
        this.settle(request, 'idle');
        return true;
      }
      const message = toMessageRequest(this.current(), view.wanted);
      await this.api.send(listingId, message, request.signal);
      this._sent.set(toMessageSentView(view.posterFirstName, message));
      this.drafts.clear(listingId);
      this.current.set(EMPTY_MESSAGE_DRAFT);
      this.checked.set(false);
      this.settle(request, 'sent');
    } catch (error) {
      if (request.signal.aborted) {
        return true;
      }
      if (!isApiError(error)) {
        this.settle(request, 'failed');
        throw error;
      }
      if (error.code === 'not_found') {
        // Taken down while the member wrote: the screen says so; the draft is still kept.
        this.settle(request, 'idle');
        void this.listing.load();
      } else if (error.code === 'message_limit_reached') {
        this.retryAt.set(error.retryAt);
        this.settle(request, 'limited');
        this.reopenAt(error.retryAt);
      } else {
        this.settle(request, 'failed');
      }
    }
    return true;
  }

  private settle(request: AbortController, state: MessageState): void {
    if (this.request === request) {
      this.request = null;
      this._state.set(state);
    }
  }

  /** Turns the send button back on when the limit lifts (L2-016, criterion 6). */
  private reopenAt(retryAt: string | null): void {
    const at = retryAt === null ? Number.NaN : Date.parse(retryAt);
    if (Number.isNaN(at)) {
      return;
    }
    const wait = Math.min(Math.max(at - Date.now(), 0), MAX_WAIT_MS);
    this.reopenTimer = setTimeout(() => {
      this.reopenTimer = null;
      if (this._state() === 'limited') {
        this.retryAt.set(null);
        this._state.set('idle');
      }
    }, wait);
  }

  private release(): void {
    this.request?.abort();
    this.request = null;
    if (this.reopenTimer !== null) {
      clearTimeout(this.reopenTimer);
      this.reopenTimer = null;
    }
  }
}
