const COUNT = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** A number of listings, with thousands separators: "7", "1,204" (segmented.html, Content). */
export function formatCount(count: number): string {
  return COUNT.format(count);
}

/** What a field uses of its limit: "55 / 1,000" (textarea.html, Content; L2-010, criterion 15). */
export function formatCounter(used: number, limit: number): string {
  return `${COUNT.format(used)} / ${COUNT.format(limit)}`;
}
