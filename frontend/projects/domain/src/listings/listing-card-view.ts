import type { ListingCard, ListingCardView } from '@rent/api';
import { formatPlace } from './format-place';
import { formatPrice } from './format-price';
import { formatWhen } from './format-when';

/**
 * What `cr-listing-card` draws for a listing (L2-001, criteria 3 to 9). A listing for rent
 * leads with its first photo; a wanted listing has none, and shows who is asking and when.
 * Member-written text passes through as text: the card never renders it as HTML.
 */
export function toListingCardView(card: ListingCard): ListingCardView {
  const wanted = card.offer === 'wanted';
  return {
    href: `/listings/${card.id}`,
    wanted,
    tag: wanted ? `Wanted · ${card.kind}` : card.kind,
    title: card.title,
    price: formatPrice(card.price, card.offer),
    place: formatPlace(card.area, card.distanceKm),
    church: card.churchName,
    poster: wanted ? card.posterName : null,
    when: wanted ? formatWhen(card.when) : null,
    photo:
      wanted || card.photo === null
        ? null
        : {
            url: card.photo.url,
            width: card.photo.width,
            height: card.photo.height,
            alt: card.photo.description ?? '',
          },
  };
}
