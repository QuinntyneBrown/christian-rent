import { BrowseQuery, MAX_TERM_LENGTH } from './browse-query';

function params(values: Record<string, string>): { get(name: string): string | null } {
  return { get: (name) => values[name] ?? null };
}

// search-and-filter design; ADR 0015: the address holds show, kind and q, defaults omitted.
describe('BrowseQuery', () => {
  it('is Everything, All and no term at the plain address', () => {
    const query = BrowseQuery.fromParams(params({}));

    expect(query).toMatchObject({ offer: 'everything', kind: 'all', term: '' });
    expect(query.toParams()).toEqual({});
    expect(query.filter()).toEqual({ offer: null, kind: null, term: '' });
  });

  it.each([
    [{ show: 'for-rent' }, 'for-rent'],
    [{ show: 'wanted' }, 'wanted'],
    [{ show: 'everything' }, 'everything'],
    [{ show: 'FOR-RENT' }, 'everything'],
    [{ show: '<b>' }, 'everything'],
  ])('reads %o as the offer %s', (values, offer) => {
    expect(BrowseQuery.fromParams(params(values)).offer).toBe(offer);
  });

  it.each([
    [{ kind: 'space' }, 'space'],
    [{ kind: 'thing' }, 'thing'],
    [{ kind: 'all' }, 'all'],
    [{ kind: 'spaces' }, 'all'],
  ])('reads %o as the kind %s', (values, kind) => {
    expect(BrowseQuery.fromParams(params(values)).kind).toBe(kind);
  });

  it('writes only what differs from the default', () => {
    const query = BrowseQuery.fromParams(
      params({ show: 'wanted', kind: 'thing', q: 'folding chairs' }),
    );

    expect(query.toParams()).toEqual({ show: 'wanted', kind: 'thing', q: 'folding chairs' });
    expect(query.filter()).toEqual({ offer: 'wanted', kind: 'thing', term: 'folding chairs' });
  });

  // L2-003 criterion 4: only the first 100 characters are used, from the address too.
  it('keeps the first 100 characters of a term', () => {
    const long = 'a'.repeat(MAX_TERM_LENGTH + 20);

    expect(BrowseQuery.fromParams(params({ q: long })).term).toHaveLength(MAX_TERM_LENGTH);
    expect(new BrowseQuery().withTerm(long).term).toHaveLength(MAX_TERM_LENGTH);
  });

  it('keeps the term as typed and trims it only for the request', () => {
    const query = new BrowseQuery().withTerm('  hall ');

    expect(query.term).toBe('  hall ');
    expect(query.toParams()).toEqual({ q: '  hall ' });
    expect(query.filter().term).toBe('hall');
  });

  it('treats a term of white space as no term', () => {
    const query = new BrowseQuery().withTerm('   ');

    expect(query.toParams()).toEqual({});
    expect(query.filter().term).toBe('');
    expect(query.equals(new BrowseQuery())).toBe(true);
  });

  it('changes one choice and keeps the others', () => {
    const query = new BrowseQuery().withTerm('hall').withOffer('for-rent').withKind('space');

    expect(query).toMatchObject({ offer: 'for-rent', kind: 'space', term: 'hall' });
    expect(query.withOffer('everything').toParams()).toEqual({ kind: 'space', q: 'hall' });
  });

  it('is equal to another query that sends the same request', () => {
    const query = new BrowseQuery().withOffer('wanted').withTerm('van');

    expect(query.equals(new BrowseQuery().withOffer('wanted').withTerm(' van'))).toBe(true);
    expect(query.equals(query.withKind('thing'))).toBe(false);
    expect(query.equals(query.withTerm('vans'))).toBe(false);
  });

  it('says what changed beyond the term', () => {
    const query = new BrowseQuery().withTerm('van');

    expect(query.sameChoices(query.withTerm('vans'))).toBe(true);
    expect(query.sameChoices(query.withOffer('wanted'))).toBe(false);
    expect(query.sameChoices(query.withKind('space'))).toBe(false);
  });
});
