import type { ListingKind, ListingOffer, PricePeriod } from '@rent/api';

/** Whether "when" is given in words or as a start and an end date (L2-010, criterion 10). */
export type WhenMode = 'text' | 'dates';

/**
 * A photo that is in (add-photos design; ADR 0021): its identifier and the addresses of the
 * renditions Post draws, the picker's thumbnail and the preview's card.
 */
export interface DraftPhoto {
  readonly id: string;
  readonly thumbUrl: string;
  readonly cardUrl: string;
}

/** The most photos a listing for rent has (L2-013, criterion 3). */
export const MAX_PHOTOS = 6;

/**
 * A listing being written on Post, held in the browser until it is published
 * (compose-listing design). Every field is kept as typed, so switching the offer, the kind or
 * the way "when" is given loses nothing; the price is the text typed, read when it is checked
 * and sent. The dates are ISO dates (YYYY-MM-DD) or empty. `photos` are the photos that are in,
 * in the order they were added, the first on the card. `clientRequestId` is made once per
 * draft, so a repeated submission is the same listing (L2-012, criterion 4).
 */
export interface ListingDraft {
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: string;
  readonly pricePeriod: PricePeriod;
  readonly whenMode: WhenMode;
  readonly whenText: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly area: string;
  readonly note: string;
  readonly photos: readonly DraftPhoto[];
  readonly clientRequestId: string;
}

/** The limits of a listing's fields (L2-010), as the backend counts them. */
export const DRAFT_LIMITS = { title: 80, whenText: 80, area: 80, note: 1000 } as const;

/** A new draft: a thing, for rent unless asked, per day, "when" in words (L2-009, criterion 6). */
export function newDraft(clientRequestId: string, offer: ListingOffer = 'for-rent'): ListingDraft {
  return {
    offer,
    kind: 'thing',
    title: '',
    price: '',
    pricePeriod: 'day',
    whenMode: 'text',
    whenText: '',
    startDate: '',
    endDate: '',
    area: '',
    note: '',
    photos: [],
    clientRequestId,
  };
}

/**
 * The draft as another offer, with every field kept (L2-009, criterion 1). A wanted listing
 * keeps its photos but shows and sends none, so they are back when it is for rent again
 * (L2-013, criterion 9; ADR 0021).
 */
export function withOffer(draft: ListingDraft, offer: ListingOffer): ListingDraft {
  return { ...draft, offer };
}

/** The draft with a photo added after the others; never a seventh, never one twice. */
export function withPhoto(draft: ListingDraft, photo: DraftPhoto): ListingDraft {
  if (draft.photos.length >= MAX_PHOTOS || draft.photos.some((each) => each.id === photo.id)) {
    return draft;
  }
  return { ...draft, photos: [...draft.photos, photo] };
}

/** The draft without the photo, the others in their order (L2-013, criterion 2). */
export function withoutPhoto(draft: ListingDraft, id: string): ListingDraft {
  return draft.photos.some((photo) => photo.id === id)
    ? { ...draft, photos: draft.photos.filter((photo) => photo.id !== id) }
    : draft;
}

/**
 * The draft as Browse's address asks for it (L2-004, criterion 2; L2-005): `offer` when it is
 * a known word, and `title` when given; anything else keeps the draft as it is (ADR 0019).
 */
export function arriveWith(
  draft: ListingDraft,
  offer: string | null | undefined,
  title: string | null | undefined,
): ListingDraft {
  let next = draft;
  if (offer === 'for-rent' || offer === 'wanted') {
    next = withOffer(next, offer);
  }
  if (title) {
    next = { ...next, title: title.slice(0, DRAFT_LIMITS.title) };
  }
  return next;
}
