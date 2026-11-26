import type {
  ReviewDetailView,
  ReviewFactView,
  ReviewItemDetail,
  ReviewListing,
  ReviewListingView,
} from '@rent/api';
import { formatPrice } from '../listings/format-price';
import { formatWhen } from '../listings/format-when';
import { formatInstant, formatMonth } from './review-words';

/**
 * Everything the detail panel shows to decide on an item (L2-019, criteria 2, 7 and 15). A
 * photo nobody has described is described by the title and its position (ADR 0016).
 * Member-written text passes through as text: the screen never renders it as HTML.
 */
export function toReviewDetailView(detail: ReviewItemDetail): ReviewDetailView {
  return listingView(detail.listing!);
}

function listingView(listing: ReviewListing): ReviewListingView {
  const wanted = listing.offer === 'wanted';
  const price = formatPrice(listing.price, listing.offer);
  return {
    type: 'listing',
    report: null,
    wanted,
    photos: wanted
      ? []
      : listing.photos.map((photo, index, all) => ({
          url: photo.url,
          alt: photo.description ?? `${listing.title}, photo ${index + 1} of ${all.length}`,
        })),
    title: listing.title,
    price: price === null ? null : [price.amount, price.per].filter(Boolean).join(' '),
    tag: `${wanted ? 'Wanted' : 'For rent'} · ${listing.kind}`,
    note: listing.note?.trim() ? listing.note : null,
    facts: [...listingFacts(listing), fact('Posted', formatInstant(listing.postedAt))],
    siteHref: null,
  };
}

/** The facts of a listing and of who posted it; one with nothing to say is left out. */
function listingFacts(listing: ReviewListing): ReviewFactView[] {
  const { poster } = listing;
  const when = formatWhen(listing.when);
  return [
    fact('Posted by', poster.name, poster.isVerified ? 'member' : null),
    fact('Church', poster.church.name, poster.church.isVerified ? 'church' : null),
    ...(when === null ? [] : [fact('When', when)]),
    fact('Where', listing.area),
    fact('Member since', formatMonth(poster.joinedAt)),
  ];
}

function fact(
  term: string,
  value: string,
  verified: ReviewFactView['verified'] = null,
): ReviewFactView {
  return { term, value, verified };
}
