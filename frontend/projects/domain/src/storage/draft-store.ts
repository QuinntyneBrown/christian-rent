import type { DraftPhoto, ListingDraft } from '../listings/listing-draft';

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
 * whole, valid draft comes back, whose photos are the API's (ADR 0021). A storage that is missing or refuses to write is ignored.
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
  const photos = toPhotos(stored['photos']);
  if (
    !texts ||
    !OFFERS.includes(stored['offer'] as string) ||
    !KINDS.includes(stored['kind'] as string) ||
    !PERIODS.includes(stored['pricePeriod'] as string) ||
    !MODES.includes(stored['whenMode'] as string) ||
    photos === null ||
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
    photos,
    clientRequestId: stored['clientRequestId'],
  } as ListingDraft;
}

/** Where a kept photo's addresses may lead: the API's own photos, never another origin. */
const PHOTO_ADDRESS = /^\/api\/photos\/[^/?#]+\/[a-z]+$/;

/** The kept photos, each whole and from the API; null when any is not. */
function toPhotos(value: unknown): DraftPhoto[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const photos: DraftPhoto[] = [];
  for (const item of value as unknown[]) {
    const photo = (typeof item === 'object' && item !== null ? item : {}) as Record<
      string,
      unknown
    >;
    const { id, thumbUrl, cardUrl } = photo;
    if (
      typeof id !== 'string' ||
      id === '' ||
      typeof thumbUrl !== 'string' ||
      typeof cardUrl !== 'string' ||
      !PHOTO_ADDRESS.test(thumbUrl) ||
      !PHOTO_ADDRESS.test(cardUrl)
    ) {
      return null;
    }
    photos.push({ id, thumbUrl, cardUrl });
  }
  return photos;
}
