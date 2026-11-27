/** Where Post's draft is kept in `sessionStorage` (compose-listing design). */
export const DRAFT_KEY = 'cr.post.draft';

/** Where a listing's message draft is kept in `sessionStorage` (send-message design). */
export function messageDraftKey(listingId: string): string {
  return `cr.message.draft.${listingId}`;
}
