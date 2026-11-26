import { arriveWith, newDraft, withOffer } from './listing-draft';

describe('newDraft', () => {
  // L2-009 criterion 6; L2-010 criterion 10: a thing, for rent, "when" in words.
  it('is a thing for rent, per day, with "when" in words', () => {
    expect(newDraft('id-1')).toMatchObject({
      offer: 'for-rent',
      kind: 'thing',
      pricePeriod: 'day',
      whenMode: 'text',
      photoIds: [],
      clientRequestId: 'id-1',
    });
  });

  it('takes the offer it is asked for', () => {
    expect(newDraft('id-1', 'wanted').offer).toBe('wanted');
  });
});

describe('withOffer', () => {
  // L2-009 criterion 1: wanted drops the photos and keeps every other field.
  it('drops the photos of a wanted listing and keeps the rest', () => {
    const draft = { ...newDraft('id-1'), title: 'Hall', photoIds: ['p1'] };

    expect(withOffer(draft, 'wanted')).toEqual({ ...draft, offer: 'wanted', photoIds: [] });
  });

  it('keeps the photos of a listing for rent', () => {
    const draft = { ...newDraft('id-1'), photoIds: ['p1'] };

    expect(withOffer(draft, 'for-rent').photoIds).toEqual(['p1']);
  });
});

describe('arriveWith', () => {
  const draft = { ...newDraft('id-1'), title: 'Hall', area: 'Langley' };

  // L2-004 criterion 2; L2-005 criteria 2 and 3; ADR 0019.
  it.each([
    ['wanted', 'Van', { offer: 'wanted', title: 'Van', area: 'Langley' }],
    ['for-rent', null, { offer: 'for-rent', title: 'Hall', area: 'Langley' }],
    ['wanted', undefined, { offer: 'wanted', title: 'Hall', area: 'Langley' }],
    ['for-sale', 'Van', { offer: 'for-rent', title: 'Van', area: 'Langley' }],
    [null, '', { offer: 'for-rent', title: 'Hall', area: 'Langley' }],
  ] as const)('with offer %s and title %s', (offer, title, expected) => {
    expect(arriveWith(draft, offer, title)).toMatchObject(expected);
  });

  it('cuts a title from the address to 80 characters', () => {
    expect(arriveWith(draft, null, 'a'.repeat(90)).title).toHaveLength(80);
  });
});
