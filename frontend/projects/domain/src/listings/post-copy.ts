import type { ListingOffer } from '@rent/api';

/** The words of Post that follow the offer (compose-listing design; L2-009, criterion 5). */
export interface PostCopy {
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly priceLabel: string;
  /** "Optional" beside the budget of a wanted listing (L2-010, criterion 11). */
  readonly priceOptional: string | null;
  readonly pricePrefix: string;
  readonly notePlaceholder: string;
  readonly submit: string;
}

const FOR_RENT: PostCopy = {
  titleLabel: 'What is it?',
  titlePlaceholder: 'Pressure washer and drill kit',
  priceLabel: 'Price',
  priceOptional: null,
  pricePrefix: '$',
  notePlaceholder: 'Pick up from my garage. Happy to show you how it works.',
  submit: 'Publish listing',
};

const WANTED: PostCopy = {
  titleLabel: 'What do you need?',
  titlePlaceholder: '15-passenger van for youth camp',
  priceLabel: 'Your budget',
  priceOptional: 'Optional',
  pricePrefix: 'Up to $',
  notePlaceholder: 'Dates, how you’ll use it, how you’ll get it there…',
  submit: 'Post request',
};

export function postCopy(offer: ListingOffer): PostCopy {
  return offer === 'wanted' ? WANTED : FOR_RENT;
}
