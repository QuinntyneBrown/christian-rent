/**
 * The site's origin from Admin's deploy-time `config.json`, or null (ADR 0028; L2-041,
 * criterion 3). Only an absolute `http` or `https` origin is accepted: no path beyond `/`, no
 * query, fragment or credentials. The value comes from the deployment, never from a person, and
 * anything else is refused rather than followed.
 */
export function parseSiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() !== value || value === '') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const plain =
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    !value.endsWith('?') &&
    !value.endsWith('#');
  return plain ? url.origin : null;
}
