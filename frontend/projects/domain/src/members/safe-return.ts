/**
 * The address to go back to after signing in, within the same application (L2-037, criterion 6;
 * ADR 0029): a path that starts with one `/`. An absolute address, a protocol-relative one
 * (`//host`), a backslash that a browser reads as one, a control character, or nothing at all
 * returns the person to the application's home, `/`, so sign-in is never an open redirect.
 */
export function safeReturn(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) {
    return '/';
  }
  return value;
}
