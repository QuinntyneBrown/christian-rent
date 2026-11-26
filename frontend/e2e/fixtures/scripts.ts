import type { Page } from '@playwright/test';

/**
 * Keeps the text of every script the page downloads, so a spec can say what code was, and was
 * not, loaded (L2-019, criterion 5). Start it before the page opens.
 */
export function recordScripts(page: Page): { readonly bodies: Promise<string>[] } {
  const bodies: Promise<string>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') {
      bodies.push(response.text().catch(() => ''));
    }
  });
  return { bodies };
}

/** True when any recorded script holds `marker`. */
export async function anyScriptHolds(
  recorded: { readonly bodies: Promise<string>[] },
  marker: string,
): Promise<boolean> {
  const texts = await Promise.all(recorded.bodies);
  return texts.some((text) => text.includes(marker));
}
