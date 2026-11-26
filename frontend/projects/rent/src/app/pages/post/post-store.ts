import { Injectable, computed, signal } from '@angular/core';
import type { ListingKind, ListingOffer } from '@rent/api';
import { type ListingDraft, arriveWith, newDraft, postCopy, withOffer } from '@rent/domain';

/**
 * Post's state, scoped to its route (compose-listing design): the draft and the copy that
 * follows its offer. Switching the offer or the kind keeps every field (L2-009, criteria 1
 * and 2).
 */
@Injectable()
export class PostStore {
  private readonly current = signal<ListingDraft>(newDraft(crypto.randomUUID()));

  readonly draft = this.current.asReadonly();
  readonly copy = computed(() => postCopy(this.current().offer));

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
}
