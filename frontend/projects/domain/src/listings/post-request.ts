import type { PostListingRequest } from '@rent/api';
import { oneLine, parsePrice } from './draft-validator';
import type { ListingDraft } from './listing-draft';

/**
 * What is sent to post a checked draft (publish-listing design): the one-line fields cleaned
 * as the backend counts them, the note trimmed, "when" as words or as dates, a price with its
 * period only when one is given, and the photos in order, none for a wanted listing. A draft is checked by `validateDraft` before it is sent.
 */
export function toPostRequest(draft: ListingDraft): PostListingRequest {
  const amount = parsePrice(draft.price);
  const priceAmount = typeof amount === 'number' ? amount : null;
  const inWords = draft.whenMode === 'text';
  const note = draft.note.trim();
  return {
    clientRequestId: draft.clientRequestId,
    offer: draft.offer,
    kind: draft.kind,
    title: oneLine(draft.title),
    priceAmount,
    pricePeriod: priceAmount === null ? null : draft.pricePeriod,
    whenText: inWords ? oneLine(draft.whenText) : null,
    startDate: inWords ? null : draft.startDate,
    endDate: inWords ? null : draft.endDate,
    area: oneLine(draft.area),
    note: note === '' ? null : note,
    photoIds: draft.offer === 'wanted' ? [] : draft.photos.map((photo) => photo.id),
  };
}
