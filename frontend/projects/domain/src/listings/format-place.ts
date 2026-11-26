const KILOMETRES = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** A distance in kilometres, "3 km" (L2-022, criterion 2). */
export function formatDistance(km: number): string {
  return `${KILOMETRES.format(km)} km`;
}

/**
 * The area followed by its distance, "Langley · 3 km" (L2-001, criterion 9); the area alone
 * while the distance is unknown (ADR 0012).
 */
export function formatPlace(area: string, distanceKm: number | null): string {
  return distanceKm === null ? area : `${area} · ${formatDistance(distanceKm)}`;
}
