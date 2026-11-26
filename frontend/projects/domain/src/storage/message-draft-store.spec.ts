import { MessageDraftStore, messageDraftKey } from './message-draft-store';

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

const draft = { text: '<b>Hi Dan</b>', startDate: '2026-06-13', endDate: '2026-06-15' };

// send-message design (MessageDraftStore); ADR 0022; L2-015 criteria 5 and 14.
describe('MessageDraftStore', () => {
  it('keeps a draft under cr.message.draft.{listingId} and gives it back', () => {
    const storage = new MemoryStorage();
    const store = new MessageDraftStore(storage);

    store.save('hall', draft);

    expect(messageDraftKey('hall')).toBe('cr.message.draft.hall');
    expect(storage.getItem('cr.message.draft.hall')).toBe(JSON.stringify(draft));
    expect(store.restore('hall')).toEqual(draft);
    expect(store.restore('van')).toBeNull();
  });

  it('keeps nothing for an empty draft, so nothing piles up', () => {
    const storage = new MemoryStorage();
    const store = new MessageDraftStore(storage);
    store.save('hall', draft);

    store.save('hall', { text: '', startDate: '', endDate: '' });

    expect(storage.length).toBe(0);
  });

  it('clears one listing’s draft and leaves the others', () => {
    const store = new MessageDraftStore(new MemoryStorage());
    store.save('hall', draft);
    store.save('van', draft);

    store.clear('hall');

    expect(store.restore('hall')).toBeNull();
    expect(store.restore('van')).toEqual(draft);
  });

  it.each([
    ['not JSON', '{'],
    ['not an object', '"text"'],
    ['a field missing', JSON.stringify({ text: 'Hi', startDate: '' })],
    ['a field that is not text', JSON.stringify({ text: 1, startDate: '', endDate: '' })],
    ['a date that is not a date', JSON.stringify({ text: 'Hi', startDate: '<b>', endDate: '' })],
  ])('ignores what is stored when it is %s', (_, stored) => {
    const storage = new MemoryStorage();
    storage.setItem('cr.message.draft.hall', stored);

    expect(new MessageDraftStore(storage).restore('hall')).toBeNull();
  });

  it('keeps only the three fields, whatever else is stored', () => {
    const storage = new MemoryStorage();
    storage.setItem('cr.message.draft.hall', JSON.stringify({ ...draft, extra: 'x' }));

    expect(new MessageDraftStore(storage).restore('hall')).toEqual(draft);
  });

  it('carries on without a storage, or with one that refuses', () => {
    const storage = new MemoryStorage();
    storage.refuse = true;

    expect(() => new MessageDraftStore(storage).save('hall', draft)).not.toThrow();
    expect(() => new MessageDraftStore(null).save('hall', draft)).not.toThrow();
    expect(new MessageDraftStore(null).restore('hall')).toBeNull();
    expect(() => new MessageDraftStore(null).clear('hall')).not.toThrow();
  });
});
