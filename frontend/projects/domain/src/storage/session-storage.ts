/** The tab's `sessionStorage`, or null where the browser refuses it. */
export function sessionStorageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
