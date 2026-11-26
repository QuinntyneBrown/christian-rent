import type { Page, Response } from '@playwright/test';

/**
 * Every script a page is sent, so a spec can tell whether a part of the app was downloaded.
 * Start it before the page is opened.
 */
export class ScriptsPart {
  private readonly bodies: Promise<string>[] = [];

  constructor(page: Page) {
    page.on('response', (response: Response) => {
      if (response.request().resourceType() === 'script') {
        this.bodies.push(response.text());
      }
    });
  }

  /** Whether any script sent so far has `marker` in it. */
  async include(marker: string): Promise<boolean> {
    return (await Promise.all(this.bodies)).some((body) => body.includes(marker));
  }
}
