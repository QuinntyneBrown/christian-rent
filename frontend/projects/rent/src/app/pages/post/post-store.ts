import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { type ListingKind, type ListingOffer, SESSION } from '@rent/api';
import {
  DRAFT_LIMITS,
  DraftStore,
  type ListingDraft,
  arriveWith,
  draftToCard,
  formatCounter,
  formatWhen,
  newDraft,
  postCopy,
  summaryOf,
  validateDraft,
  withOffer,
} from '@rent/domain';

/**
 * Post's state, scoped to its route (compose-listing design): the draft, its errors once the
 * member has submitted, and the copy that follows its offer. Switching the offer or the kind
 * keeps every field (L2-009, criteria 1 and 2). The draft is written to `sessionStorage` on
 * every change and read back when Post opens, so it survives the join dialog and a reload
 * (ADR 0019).
 */
@Injectable()
export class PostStore {
  private readonly session = inject(SESSION);
  private readonly drafts = new DraftStore(sessionStorageOf(inject(DOCUMENT)));
  private readonly current = signal<ListingDraft>(
    this.drafts.restore() ?? newDraft(crypto.randomUUID()),
  );
  /** Set once the member submits; from then on errors follow every change. */
  private readonly checked = signal(false);

  readonly draft = this.current.asReadonly();
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

  patch(change: Partial<Omit<ListingDraft, 'offer' | 'clientRequestId' | 'photoIds'>>): void {
    this.current.update((draft) => ({ ...draft, ...change }));
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
