import { safeReturn } from './safe-return';

// L2-037 criterion 6: which return addresses are followed, one case per row.
describe('safeReturn', () => {
  const cases: [string, string | null | undefined, string][] = [
    ['a path', '/post', '/post'],
    ['a path with a query', '/?show=wanted&q=van', '/?show=wanted&q=van'],
    ['a listing', '/listings/abc', '/listings/abc'],
    ['nothing', null, '/'],
    ['no value', undefined, '/'],
    ['an empty one', '', '/'],
    ['an absolute address', 'https://evil.example/', '/'],
    ['a protocol-relative address', '//evil.example', '/'],
    ['a backslash a browser reads as a slash', '/\\evil.example', '/'],
    ['a backslash further on', '/post\\..\\x', '/'],
    ['a script address', 'javascript:alert(1)', '/'],
    ['a relative path', 'post', '/'],
    ['a control character', '/post\n//evil.example', '/'],
  ];

  it.each(cases)('reads %s', (_case, value, expected) => {
    expect(safeReturn(value)).toBe(expected);
  });
});
