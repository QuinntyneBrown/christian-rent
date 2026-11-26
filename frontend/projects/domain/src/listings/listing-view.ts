import type { GalleryPhotoView, ListingDetail, ListingView, MessagePriceView } from '@rent/api';
import { formatAge } from './format-age';
import { formatPlace } from './format-place';
import { formatPrice } from './format-price';
import { formatWhen } from './format-when';
import { avatarTint, firstNameOf, initialsOf } from './member-name';

/**
 * What the Listing screen draws for a listing (read-listing design; L2-007, L2-008, L2-022).
 * A listing for rent shows its photos, a wanted one none. A photo nobody has described yet is
 * described by the title and its position (ADR 0015). Member-written text passes through as
 * text: the screen never renders it as HTML.
 */
export function toListingView(detail: ListingDetail, now: Date): ListingView {
  const wanted = detail.offer === 'wanted';
  const firstName = firstNameOf(detail.poster.name);
  const initials = initialsOf(detail.poster.name);
  const note = detail.note?.trim() ? detail.note : null;
  return {
    wanted,
    tag: `${wanted ? 'Wanted' : 'For rent'} · ${detail.kind}`,
    title: detail.title,
    photos: wanted
      ? []
      : detail.photos.map((photo, index, all) => photoView(detail, photo, index, all.length)),
    place: formatPlace(detail.area, detail.distanceKm),
    when: formatWhen(detail.when),
    posted: formatAge(detail.postedAt, now),
    note,
    poster: {
      name: detail.poster.name,
      initials,
      tint: avatarTint(initials),
      isVerified: detail.poster.isVerified,
      church: detail.poster.church.name,
      churchIsVerified: detail.poster.church.isVerified,
      since: `Member since ${detail.poster.memberSince}`,
    },
    messageHeading: wanted
      ? `Offer to help ${firstName} about this listing`
      : `Message ${firstName} about this listing`,
    price: priceView(detail),
  };
}

function photoView(
  detail: ListingDetail,
  photo: ListingDetail['photos'][number],
  index: number,
  count: number,
): GalleryPhotoView {
  return {
    url: photo.url,
    thumbUrl: photo.thumbUrl,
    width: photo.width,
    height: photo.height,
    alt: photo.description?.trim() || `${detail.title}, photo ${index + 1} of ${count}`,
  };
}

/** "Rent for $45 CAD / hour", "They’ll pay Up to $120 CAD / day" (L2-022, criterion 9). */
function priceView(detail: ListingDetail): MessagePriceView | null {
  const price = formatPrice(detail.price, detail.offer);
  if (price === null) {
    return null;
  }
  return {
    eyebrow: detail.offer === 'wanted' ? 'They’ll pay' : 'Rent for',
    amount: price.amount,
    unit: price.per === null ? null : `CAD ${price.per}`,
  };
}
