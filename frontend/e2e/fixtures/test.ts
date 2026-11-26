import { test as base, expect } from '@playwright/test';
import { ApiFixtures } from './api';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

interface Fixtures {
  /** Page errors a spec raises on purpose; any other fails it. */
  expectedPageErrors: string[];
  api: ApiFixtures;
  guard: void;
}

/**
 * The shared fixture every spec imports `test` and `expect` from. It fails a spec on a page
 * error, on a request that leaves localhost, and on an API request no fixture answered.
 */
export const test = base.extend<Fixtures>({
  expectedPageErrors: [[], { option: true }],
  api: async ({}, use) => {
    await use(new ApiFixtures());
  },
  guard: [
    async ({ page, api, expectedPageErrors }, use) => {
      const pageErrors: string[] = [];
      const offLocalhost: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.context().route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.protocol === 'data:' || url.protocol === 'blob:') {
          await route.continue();
        } else if (!LOCAL_HOSTS.has(url.hostname)) {
          offLocalhost.push(url.href);
          await route.abort('blockedbyclient');
        } else if (url.pathname.startsWith('/api/')) {
          await api.handle(route);
        } else {
          await route.continue();
        }
      });

      await use();

      expect(
        pageErrors.filter((message) => !expectedPageErrors.includes(message)),
        'page errors',
      ).toEqual([]);
      expect(offLocalhost, 'requests off localhost').toEqual([]);
      expect(api.unanswered, 'API requests no fixture answered').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
