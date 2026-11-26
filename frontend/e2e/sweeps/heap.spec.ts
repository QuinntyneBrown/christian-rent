import { expect, test } from '../fixtures/test';

// AGENTS.md, Prove it: leaving a screen returns its memory. Enter and leave a screen many times
// and compare the heap after garbage collection. Run only when a person asks. Journeys that
// allocate heavily (Browse's list, the photo upload) add their screens here.
const ROUNDS = 20;
const ALLOWED_GROWTH_BYTES = 1_000_000;

test('moving between Browse and "not found" keeps the heap stable', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  const heapAfterGc = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    return usedSize;
  };

  await page.goto('/');
  const goToBrowse = page.getByRole('link', { name: 'Go to Browse' });
  const home = page.getByRole('heading', { level: 1 });

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/no-such-page'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
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
