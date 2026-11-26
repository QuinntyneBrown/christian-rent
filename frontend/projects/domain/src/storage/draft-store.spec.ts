import { newDraft } from '../listings/listing-draft';
import { DRAFT_KEY, DraftStore } from './draft-store';

/** A `Storage` in memory, which can be told to refuse writes as a full or private one does. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  refuse = false;
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.refuse) {
      throw new DOMException('Full', 'QuotaExceededError');
    }
    this.items.set(key, value);
  }
}

// compose-listing design (DraftStore); ADR 0019; L2-012 criterion 11.
describe('DraftStore', () => {
  const draft = { ...newDraft('id-1', 'wanted'), title: '<b>Van</b>', whenMode: 'dates' as const };

  it('keeps a draft under cr.post.draft and gives it back', () => {
    const storage = new MemoryStorage();
    const store = new DraftStore(storage);

    store.save(draft);

    expect(storage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(new DraftStore(storage).restore()).toEqual(draft);
  });

  it('forgets the draft once cleared', () => {
    const storage = new MemoryStorage();
    const store = new DraftStore(storage);
    store.save(draft);

    store.clear();

    expect(store.restore()).toBeNull();
  });

  // Stored content is data: anything that is not a whole, valid draft is ignored.
  it.each([
    ['nothing', null],
    ['not JSON', '{'],
    ['not an object', '"draft"'],
    ['an unknown offer', JSON.stringify({ ...draft, offer: 'for-sale' })],
    ['an unknown kind', JSON.stringify({ ...draft, kind: 'place' })],
    ['an unknown period', JSON.stringify({ ...draft, pricePeriod: 'night' })],
    ['an unknown way of giving "when"', JSON.stringify({ ...draft, whenMode: 'later' })],
    ['a field that is not text', JSON.stringify({ ...draft, title: 42 })],
    ['photos that are not text', JSON.stringify({ ...draft, photoIds: [1] })],
    ['no client request', JSON.stringify({ ...draft, clientRequestId: '' })],
  ])('ignores %s', (_, stored) => {
    const storage = new MemoryStorage();
    if (stored !== null) {
      storage.setItem(DRAFT_KEY, stored);
    }

    expect(new DraftStore(storage).restore()).toBeNull();
  });

  it('keeps only the fields of a draft', () => {
    const storage = new MemoryStorage();
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, extra: '<script>' }));

    expect(new DraftStore(storage).restore()).toEqual(draft);
  });

  it('carries on when the storage refuses to write or there is none', () => {
    const storage = new MemoryStorage();
    storage.refuse = true;

    expect(() => new DraftStore(storage).save(draft)).not.toThrow();
    expect(() => new DraftStore(null).save(draft)).not.toThrow();
    expect(new DraftStore(null).restore()).toBeNull();
  });
});
