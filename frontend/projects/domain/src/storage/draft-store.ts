import type { ListingDraft } from '../listings/listing-draft';

/** Where the draft is kept in `sessionStorage` (compose-listing design). */
export const DRAFT_KEY = 'cr.post.draft';

const OFFERS = ['for-rent', 'wanted'];
const KINDS = ['space', 'thing'];
const PERIODS = ['hour', 'day', 'week', 'month'];
const MODES = ['text', 'dates'];
const TEXT_FIELDS = [
  'title',
  'price',
  'whenText',
  'startDate',
  'endDate',
  'area',
  'note',
  'clientRequestId',
] as const;

/**
 * Keeps Post's draft in the `Storage` it is given, so it survives the join dialog and a reload
 * and ends with the tab (ADR 0019; L2-012, criterion 11). What is stored is read as data: only a
 * whole, valid draft comes back. A storage that is missing or refuses to write is ignored.
 */
export class DraftStore {
  constructor(private readonly storage: Storage | null) {}

  save(draft: ListingDraft): void {
    try {
      this.storage?.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Full or private storage: the draft lasts as long as the page.
    }
  }

  restore(): ListingDraft | null {
    try {
      const stored = this.storage?.getItem(DRAFT_KEY);
      return stored ? toDraft(JSON.parse(stored) as unknown) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(DRAFT_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}

function toDraft(value: unknown): ListingDraft | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const stored = value as Record<string, unknown>;
  const texts = TEXT_FIELDS.every((field) => typeof stored[field] === 'string');
  const photoIds = stored['photoIds'];
  if (
    !texts ||
    !OFFERS.includes(stored['offer'] as string) ||
    !KINDS.includes(stored['kind'] as string) ||
    !PERIODS.includes(stored['pricePeriod'] as string) ||
    !MODES.includes(stored['whenMode'] as string) ||
    !Array.isArray(photoIds) ||
    !photoIds.every((id) => typeof id === 'string') ||
    stored['clientRequestId'] === ''
  ) {
    return null;
  }
  return {
    offer: stored['offer'],
    kind: stored['kind'],
    title: stored['title'],
    price: stored['price'],
    pricePeriod: stored['pricePeriod'],
    whenMode: stored['whenMode'],
    whenText: stored['whenText'],
    startDate: stored['startDate'],
    endDate: stored['endDate'],
    area: stored['area'],
    note: stored['note'],
    photoIds: [...(photoIds as string[])],
    clientRequestId: stored['clientRequestId'],
  } as ListingDraft;
}
