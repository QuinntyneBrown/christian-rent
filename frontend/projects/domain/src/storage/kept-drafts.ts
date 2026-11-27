// The keys alone, so signing out does not bring the stores into the initial bundle (ADR 0030).
import { DRAFT_KEY, messageDraftKey } from './draft-keys';

/**
 * Forgets what was written and kept in the tab, Post's draft and every message, so the next
 * person on a shared device does not find it after signing out (L2-039, criterion 5). A storage
 * that is missing or refuses is ignored.
 */
export function clearKeptDrafts(storage: Storage | null): void {
  if (!storage) {
    return;
  }
  try {
    const prefix = messageDraftKey('');
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
      if (key === DRAFT_KEY || key?.startsWith(prefix)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Nothing more can be done.
  }
}
