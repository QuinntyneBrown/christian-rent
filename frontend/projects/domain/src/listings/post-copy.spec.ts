import { postCopy } from './post-copy';

describe('postCopy', () => {
  // L2-009 criterion 5; L2-010 criterion 11: the labels and the button follow the offer.
  it('asks "What is it?" for a price and publishes a listing for rent', () => {
    expect(postCopy('for-rent')).toMatchObject({
      titleLabel: 'What is it?',
      priceLabel: 'Price',
      priceOptional: null,
      pricePrefix: '$',
      submit: 'Publish listing',
    });
  });

  it('asks "What do you need?" for an optional budget and posts a wanted request', () => {
    expect(postCopy('wanted')).toMatchObject({
      titleLabel: 'What do you need?',
      priceLabel: 'Your budget',
      priceOptional: 'Optional',
      pricePrefix: 'Up to $',
      submit: 'Post request',
    });
  });
});
