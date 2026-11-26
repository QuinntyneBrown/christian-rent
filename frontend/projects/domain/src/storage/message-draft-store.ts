import type { MessageDraft } from '@rent/api';

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})?$/;

/** Where a listing's message draft is kept in `sessionStorage` (send-message design). */
export function messageDraftKey(listingId: string): string {
  return `cr.message.draft.${listingId}`;
}

/**
 * Keeps what a member has written in a listing's message box in the `Storage` it is given, so
 * it survives the join dialog and a reload and ends with the tab (ADR 0022; L2-015, criteria 5
 * and 14). An empty draft is removed, so only listings with something written hold a key. What
 * is stored is read as data: only a text and two dates come back. A storage that is missing or
 * refuses to write is ignored.
 */
export class MessageDraftStore {
  constructor(private readonly storage: Storage | null) {}

  save(listingId: string, draft: MessageDraft): void {
    if (draft.text === '' && draft.startDate === '' && draft.endDate === '') {
      this.clear(listingId);
      return;
    }
    try {
      this.storage?.setItem(messageDraftKey(listingId), JSON.stringify(draft));
    } catch {
      // Full or private storage: the draft lasts as long as the page.
    }
  }

  restore(listingId: string): MessageDraft | null {
    try {
      const stored = this.storage?.getItem(messageDraftKey(listingId));
      return stored ? toDraft(JSON.parse(stored) as unknown) : null;
    } catch {
      return null;
    }
  }

  clear(listingId: string): void {
    try {
      this.storage?.removeItem(messageDraftKey(listingId));
    } catch {
      // Nothing to clear.
    }
  }
}

function toDraft(value: unknown): MessageDraft | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { text, startDate, endDate } = value as Record<string, unknown>;
  if (
    typeof text !== 'string' ||
    typeof startDate !== 'string' ||
    typeof endDate !== 'string' ||
    !ISO_DATE.test(startDate) ||
    !ISO_DATE.test(endDate)
  ) {
    return null;
  }
  return { text, startDate, endDate };
}
