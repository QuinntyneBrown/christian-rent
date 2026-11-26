import { draftToCard } from './draft-card';
import { type ListingDraft, newDraft } from './listing-draft';

const sarah = { name: 'Sarah Kim', churchName: 'Grace Community Church' };
const filled: ListingDraft = {
  ...newDraft('id-1'),
  title: '  Pressure washer   and drill kit ',
  price: '25',
  whenText: 'Most weekends',
  area: 'Willoughby, Langley',
};
const wanted: ListingDraft = {
  ...filled,
  offer: 'wanted',
  title: '15-passenger van for youth camp',
  price: '120',
  whenMode: 'dates',
  startDate: '2026-07-14',
  endDate: '2026-07-18',
  area: 'Murrayville, Langley',
};

// compose-listing design (draftToCard); L2-011 criteria 1 to 6; ADR 0019.
describe('draftToCard', () => {
  it('is the card for rent as Browse shows it, with no address and no photo yet', () => {
    expect(draftToCard(filled, sarah)).toEqual({
      href: null,
      placeholder: false,
      wanted: false,
      tag: 'thing',
      title: 'Pressure washer and drill kit',
      price: { amount: '$25', per: '/ day' },
      place: 'Willoughby, Langley',
      church: 'Grace Community Church',
      poster: null,
      when: null,
      photo: null,
    });
  });

  it('shows placeholders for an empty draft, never "undefined" or an empty price', () => {
    expect(draftToCard(newDraft('id-1'), sarah)).toMatchObject({
      placeholder: true,
      title: 'Your listing title',
      price: { amount: 'Price', per: null },
      place: 'Your area',
    });
  });

  it.each([
    ['0', { amount: 'Free', per: null }],
    ['1,250.50', { amount: '$1,250.50', per: '/ day' }],
    ['lots', { amount: 'Price', per: null }],
  ])('shows a price typed "%s" as Browse would', (price, shown) => {
    expect(draftToCard({ ...filled, price }, sarah).price).toEqual(shown);
  });

  it('is a wanted card with no photo, who asks, when, and "Up to" its budget', () => {
    expect(draftToCard(wanted, sarah)).toMatchObject({
      wanted: true,
      tag: 'Wanted · thing',
      title: '15-passenger van for youth camp',
      poster: 'Sarah Kim',
      when: 'Jul 14 to 18, 2026',
      price: { amount: 'Up to $120', per: '/ day' },
      photo: null,
    });
  });

  it('shows no price for a wanted listing with no budget, and "when" in words', () => {
    const card = draftToCard(
      { ...wanted, price: '', whenMode: 'text', whenText: 'Weekdays' },
      sarah,
    );

    expect(card.price).toBeNull();
    expect(card.when).toBe('Weekdays');
  });

  it('shows no "when" on a wanted card until it is given', () => {
    expect(draftToCard({ ...wanted, startDate: '' }, sarah).when).toBeNull();
  });

  it('names "Your church" and "Your name" for a person who is not a member yet', () => {
    expect(draftToCard(wanted, null)).toMatchObject({ church: 'Your church', poster: 'Your name' });
  });
});
