import { parseSiteUrl } from './parse-site-url';

// ADR 0028; L2-041 criterion 3: which site addresses Admin follows, one case per row.
describe('parseSiteUrl', () => {
  const cases: [string, unknown, string | null][] = [
    ['an https origin', 'https://christian.rent', 'https://christian.rent'],
    ['an origin with a trailing slash', 'https://christian.rent/', 'https://christian.rent'],
    [
      'an http origin with a port, as in development',
      'http://localhost:4200',
      'http://localhost:4200',
    ],
    ['a path', 'https://christian.rent/listings', null],
    ['a query', 'https://christian.rent/?next=x', null],
    ['a fragment', 'https://christian.rent/#top', null],
    ['credentials', 'https://user:secret@christian.rent', null],
    ['a script address', 'javascript:alert(1)', null],
    ['a protocol-relative address', '//christian.rent', null],
    ['a relative path', '/listings', null],
    ['another protocol', 'ftp://christian.rent', null],
    ['white space around it', ' https://christian.rent', null],
    ['nothing', '', null],
    ['not text', 42, null],
    ['no value', undefined, null],
  ];

  it.each(cases)('reads %s', (_case, value, expected) => {
    expect(parseSiteUrl(value)).toBe(expected);
  });
});
