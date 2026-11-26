const COUNT = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** A number of listings, with thousands separators: "7", "1,204" (segmented.html, Content). */
export function formatCount(count: number): string {
  return COUNT.format(count);
}
