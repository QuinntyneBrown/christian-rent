import {
  type DraftPhoto,
  arriveWith,
  newDraft,
  withOffer,
  withPhoto,
  withoutPhoto,
} from './listing-draft';

const photo = (id: string): DraftPhoto => ({
  id,
  thumbUrl: `/api/photos/${id}/thumb`,
  cardUrl: `/api/photos/${id}/card`,
});

describe('newDraft', () => {
  // L2-009 criterion 6; L2-010 criterion 10: a thing, for rent, "when" in words.
  it('is a thing for rent, per day, with "when" in words', () => {
    expect(newDraft('id-1')).toMatchObject({
      offer: 'for-rent',
      kind: 'thing',
      pricePeriod: 'day',
      whenMode: 'text',
      photos: [],
      clientRequestId: 'id-1',
    });
  });

  it('takes the offer it is asked for', () => {
    expect(newDraft('id-1', 'wanted').offer).toBe('wanted');
  });
});

describe('withOffer', () => {
  // L2-009 criterion 1; L2-013 criterion 9 (ADR 0021): a wanted listing keeps every field and
  // its photos, which come back when it is for rent again.
  it('keeps every field and the photos when the listing becomes wanted and for rent again', () => {
    const draft = { ...newDraft('id-1'), title: 'Hall', photos: [photo('p1')] };

    const wanted = withOffer(draft, 'wanted');

    expect(wanted).toEqual({ ...draft, offer: 'wanted' });
    expect(withOffer(wanted, 'for-rent')).toEqual(draft);
  });
});

// L2-013 criteria 1, 2 and 3; ADR 0021: photos in the order they are added, up to 6.
describe('withPhoto and withoutPhoto', () => {
  it('adds a photo after the others', () => {
    const draft = withPhoto(withPhoto(newDraft('id-1'), photo('p1')), photo('p2'));

    expect(draft.photos.map((each) => each.id)).toEqual(['p1', 'p2']);
  });

  it('adds no seventh photo and no photo twice', () => {
    const six = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].reduce(
      (draft, id) => withPhoto(draft, photo(id)),
      newDraft('id-1'),
    );

    expect(withPhoto(six, photo('p7')).photos).toHaveLength(6);
    expect(withPhoto(six, photo('p1')).photos).toHaveLength(6);
  });

  it('removes a photo and keeps the order of the rest', () => {
    const draft = { ...newDraft('id-1'), photos: [photo('p1'), photo('p2'), photo('p3')] };

    expect(withoutPhoto(draft, 'p1').photos.map((each) => each.id)).toEqual(['p2', 'p3']);
    expect(withoutPhoto(draft, 'p9')).toEqual(draft);
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
