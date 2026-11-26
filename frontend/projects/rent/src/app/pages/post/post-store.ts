import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  LISTINGS_API,
  type ListingCardView,
  type ListingKind,
  type ListingOffer,
  SESSION,
  isApiError,
} from '@rent/api';
import {
  DRAFT_LIMITS,
  type DraftPhoto,
  DraftStore,
  type ListingDraft,
  arriveWith,
  draftToCard,
  formatCounter,
  formatWhen,
  newDraft,
  postCopy,
  summaryOf,
  toPostRequest,
  validateDraft,
  withOffer,
  withPhoto,
  withoutPhoto,
} from '@rent/domain';
import { MemberGate } from '../../members/member-gate';

/** Where a post stands (publish-listing design). */
export type SubmitState = 'idle' | 'submitting' | 'sent' | 'failed' | 'limited';

/**
 * Post's state, scoped to its route (compose-listing and publish-listing designs): the draft,
 * its errors once the member has submitted, the copy that follows its offer, and where the post
 * stands. Switching the offer or the kind
 * keeps every field (L2-009, criteria 1 and 2). The draft is written to `sessionStorage` on
 * every change and read back when Post opens, so it survives the join dialog and a reload
 * (ADR 0019).
 */
@Injectable()
export class PostStore {
  private readonly session = inject(SESSION);
  private readonly api = inject(LISTINGS_API);
  private readonly gate = inject(MemberGate);
  /** Cancels a post in flight when Post is left (ADR 0019). */
  private readonly abort = new AbortController();
  private readonly drafts = new DraftStore(sessionStorageOf(inject(DOCUMENT)));
  private readonly current = signal<ListingDraft>(
    this.drafts.restore() ?? newDraft(crypto.randomUUID()),
  );
  /** Set once the member submits; from then on errors follow every change. */
  private readonly checked = signal(false);

  readonly draft = this.current.asReadonly();
  readonly submitState = signal<SubmitState>('idle');
  /** The card as it was sent, which the confirmation shows (L2-012, criterion 9). */
  readonly sentCard = signal<ListingCardView | null>(null);
  /** When posting reopens, once the posting limit refused the post (L2-012, criterion 6). */
  readonly retryAt = signal<string | null>(null);
  readonly copy = computed(() => postCopy(this.current().offer));
  readonly errors = computed(() => (this.checked() ? validateDraft(this.current()) : {}));
  readonly summary = computed(() => summaryOf(this.errors()));
  readonly noteCounter = computed(() =>
    formatCounter(this.current().note.length, DRAFT_LIMITS.note),
  );
  /** The card the preview draws, following every change (L2-011). */
  readonly previewCard = computed(() => draftToCard(this.current(), this.session.member()));
  /** The dates in words once both are chosen in order (L2-022, criterion 7). */
  readonly datesInWords = computed(() => {
    const { startDate, endDate } = this.current();
    return startDate && endDate && endDate >= startDate
      ? formatWhen({ text: null, start: startDate, end: endDate })
      : null;
  });

  constructor() {
    effect(() => this.drafts.save(this.current()));
    inject(DestroyRef).onDestroy(() => this.abort.abort());
  }

  /**
   * Asks a person who is not a member to join when Post opens; whatever they answer, Post
   * stays with what they chose (L2-009, criterion 4; ADR 0019).
   */
  async enter(): Promise<void> {
    await this.gate.requireMember('post');
  }

  /** Applies the choice Browse's address carries (ADR 0019). */
  arrive(offer: string | null | undefined, title: string | null | undefined): void {
    this.current.update((draft) => arriveWith(draft, offer, title));
  }

  setOffer(offer: ListingOffer): void {
    this.current.update((draft) => withOffer(draft, offer));
  }

  setKind(kind: ListingKind): void {
    this.current.update((draft) => ({ ...draft, kind }));
  }

  patch(change: Partial<Omit<ListingDraft, 'offer' | 'clientRequestId' | 'photos'>>): void {
    this.current.update((draft) => ({ ...draft, ...change }));
  }

  /** A photo that is in joins the others, after them (L2-013, criterion 1). */
  addPhoto(photo: DraftPhoto): void {
    this.current.update((draft) => withPhoto(draft, photo));
  }

  /** A photo leaves the draft; the preview follows (L2-013, criterion 2). */
  removePhoto(id: string): void {
    this.current.update((draft) => withoutPhoto(draft, id));
  }

  /**
   * Sends the draft once it is valid and the person is a member (L2-012, criterion 1). While it
   * is sent a second call does nothing (criterion 8). Once sent, the confirmation shows the card
   * and the kept draft is cleared (ADR 0019); a failure keeps everything (criterion 5).
   */
  async publish(): Promise<void> {
    if (this.submitState() === 'submitting' || !this.check()) {
      return;
    }
    this.submitState.set('submitting');
    if (!(await this.gate.requireMember('post'))) {
      this.submitState.set('idle');
      return;
    }
    try {
      await this.api.post(toPostRequest(this.current()), this.abort.signal);
      this.sentCard.set({ ...this.previewCard(), placeholder: false });
      this.drafts.clear();
      this.submitState.set('sent');
    } catch (error) {
      if (this.abort.signal.aborted) {
        return;
      }
      const limited = isApiError(error) && error.code === 'post_limit_reached';
      this.retryAt.set(limited ? error.retryAt : null);
      this.submitState.set(limited ? 'limited' : 'failed');
    }
  }

  /** "Post another": a new draft for the same offer, with nothing checked yet. */
  startAnother(): void {
    this.current.set(newDraft(crypto.randomUUID(), this.current().offer));
    this.checked.set(false);
    this.sentCard.set(null);
    this.submitState.set('idle');
  }

  /** Checks every field at once; true when the draft can be sent (L2-010, criterion 8). */
  check(): boolean {
    this.checked.set(true);
    return this.summary().length === 0;
  }
}

/** The tab's `sessionStorage`, or null where the browser refuses it. */
function sessionStorageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
