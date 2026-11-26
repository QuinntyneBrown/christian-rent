import { type ListingDraft, newDraft } from './listing-draft';
import { toPostRequest } from './post-request';

const draft: ListingDraft = {
  ...newDraft('id-1'),
  title: '  Pressure washer   and drill kit ',
  price: '$1,250.50',
  pricePeriod: 'week',
  whenText: ' Most   weekends ',
  startDate: '2026-07-14',
  area: ' Willoughby,  Langley ',
  note: '\n Pick up from my garage.\n',
};

// publish-listing design (HttpListingsApi.post); L2-010.
describe('toPostRequest', () => {
  it('sends the draft cleaned, with "when" in words and no dates', () => {
    expect(toPostRequest(draft)).toEqual({
      clientRequestId: 'id-1',
      offer: 'for-rent',
      kind: 'thing',
      title: 'Pressure washer and drill kit',
      priceAmount: 1250.5,
      pricePeriod: 'week',
      whenText: 'Most weekends',
      startDate: null,
      endDate: null,
      area: 'Willoughby, Langley',
      note: 'Pick up from my garage.',
      photoIds: [],
    });
  });

  // L2-013 criterion 1; ADR 0021: the photos in order for rent, none when wanted.
  it('sends the photos in order for rent, and none when wanted', () => {
    const photos = ['p2', 'p1'].map((id) => ({ id, thumbUrl: 't', cardUrl: 'c' }));

    expect(toPostRequest({ ...draft, photos }).photoIds).toEqual(['p2', 'p1']);
    expect(toPostRequest({ ...draft, photos, offer: 'wanted' }).photoIds).toEqual([]);
  });

  it('sends the dates and no words when "when" is given as dates', () => {
    expect(toPostRequest({ ...draft, whenMode: 'dates', endDate: '2026-07-18' })).toMatchObject({
      whenText: null,
      startDate: '2026-07-14',
      endDate: '2026-07-18',
    });
  });

  it('sends no price, no period and no note when there are none', () => {
    expect(toPostRequest({ ...draft, offer: 'wanted', price: ' ', note: '  ' })).toMatchObject({
      offer: 'wanted',
      priceAmount: null,
      pricePeriod: null,
      note: null,
    });
  });
});
