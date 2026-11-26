import type { ListingCardView } from '@rent/api';
import { oneLine, parsePrice } from './draft-validator';
import { formatPrice } from './format-price';
import { formatWhen } from './format-when';
import type { ListingDraft } from './listing-draft';

/** Who is posting, as the preview shows them: their name and their church (ADR 0019). */
export interface DraftPoster {
  readonly name: string;
  readonly churchName: string;
}

/**
 * The card Post's preview draws for a draft (compose-listing design; L2-011): the card Browse
 * will show, with no address. An empty title, price or area is a placeholder, never
 * "undefined" or an empty price (criterion 3); a wanted listing has no photo and shows who asks
 * and when (criteria 2 and 4); a listing for rent has the "No photo yet" placeholder until
 * journey 7 adds photos (criterion 5). For a person who is not a member yet, the church and the
 * name are "Your church" and "Your name" (criterion 6). The area has no distance (ADR 0012).
 */
export function draftToCard(draft: ListingDraft, poster: DraftPoster | null): ListingCardView {
  const wanted = draft.offer === 'wanted';
  const title = oneLine(draft.title);
  const area = oneLine(draft.area);
  const amount = parsePrice(draft.price);
  const price =
    typeof amount === 'number'
      ? formatPrice({ amount, period: draft.pricePeriod }, draft.offer)
      : wanted
        ? null
        : { amount: 'Price', per: null };
  return {
    href: null,
    placeholder: title === '',
    wanted,
    tag: wanted ? `Wanted · ${draft.kind}` : draft.kind,
    title: title || 'Your listing title',
    price,
    place: area || 'Your area',
    church: poster?.churchName ?? 'Your church',
    poster: wanted ? (poster?.name ?? 'Your name') : null,
    when: wanted ? whenOf(draft) : null,
    photo: null,
  };
}

function whenOf(draft: ListingDraft): string | null {
  return draft.whenMode === 'text'
    ? oneLine(draft.whenText) || null
    : formatWhen({ text: null, start: draft.startDate || null, end: draft.endDate || null });
}
