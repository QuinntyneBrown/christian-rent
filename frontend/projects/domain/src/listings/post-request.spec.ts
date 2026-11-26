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
