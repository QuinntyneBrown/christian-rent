/**
 * The screen an address shows: its path, without the query or the fragment. A change of the
 * query alone (Browse's search term, switch or kind filter) is the same screen.
 */
export function screenPath(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? url;
}
