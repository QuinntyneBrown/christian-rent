import { DRAFT_KEY } from './draft-store';
import { clearKeptDrafts } from './kept-drafts';
import { messageDraftKey } from './message-draft-store';

// L2-039 criterion 5: signing out forgets what was kept in the tab, and nothing else.
describe('clearKeptDrafts', () => {
  it('forgets Post’s draft and every message, and keeps the rest', () => {
    sessionStorage.clear();
    sessionStorage.setItem(DRAFT_KEY, '{}');
    sessionStorage.setItem(messageDraftKey('hall'), '{}');
    sessionStorage.setItem(messageDraftKey('van'), '{}');
    sessionStorage.setItem('something.else', 'kept');

    clearKeptDrafts(sessionStorage);

    expect(Object.keys(sessionStorage)).toEqual(['something.else']);
  });

  it('does nothing without a storage', () => {
    expect(() => clearKeptDrafts(null)).not.toThrow();
  });
});
