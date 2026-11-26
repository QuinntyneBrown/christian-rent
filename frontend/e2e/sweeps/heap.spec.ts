import type { Page } from '@playwright/test';
import { answerNoListings, answerPhotos, many, page as listingsPage } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';

// AGENTS.md, Prove it: leaving a screen returns its memory. Enter and leave a screen many times
// and compare the heap after garbage collection. Run only when a person asks. Journeys that
// allocate heavily (Browse's list, the photo upload) add their screens here.
const ROUNDS = 20;
const ALLOWED_GROWTH_BYTES = 1_000_000;

async function heapMeter(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  return async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    return usedSize;
  };
}

async function leaveForNotFound(page: Page) {
  await page.evaluate(() => history.pushState({}, '', '/no-such-page'));
  await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
}

test('moving between Browse and "not found" keeps the heap stable', async ({ page, api }) => {
  answerNoListings(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const goToBrowse = page.getByRole('link', { name: 'Go to Browse' });
  const home = page.getByRole('heading', { level: 1 });

  const roundTrip = async () => {
    await leaveForNotFound(page);
    await goToBrowse.click();
    await expect(home).toBeFocused();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// L2-030 criterion 4: scrolling 120 listings and leaving, again and again, keeps the heap bounded.
test('scrolling Browse’s list and leaving it keeps the heap stable', async ({ page, api }) => {
  const pages = [0, 1, 2, 3, 4].map((index) =>
    listingsPage(many(24, index * 24 + 1), index < 4 ? `p${index + 2}` : null),
  );
  api.answer('GET', '/api/listings', (url) => {
    const cursor = url.searchParams.get('cursor');
    return { body: pages[cursor === null ? 0 : Number(cursor.slice(1)) - 1] };
  });
  answerPhotos(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const goToBrowse = page.getByRole('link', { name: 'Go to Browse' });
  const last = page.getByRole('heading', { level: 2, name: 'Listing 120', exact: true });

  const roundTrip = async () => {
    await expect(page.locator('a.listing-card').first()).toBeVisible();
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(last).toBeAttached({ timeout: 500 });
    }).toPass();
    expect(await page.locator('a.listing-card').count()).toBeLessThanOrEqual(72);
    await leaveForNotFound(page);
    await goToBrowse.click();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < 5; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});
