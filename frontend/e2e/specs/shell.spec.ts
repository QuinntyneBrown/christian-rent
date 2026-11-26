import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

test.describe('The application shell', () => {
  // L2-023 criterion 1: the wordmark reads "christian.rent" in lowercase.
  test('the home page shows the christian.rent wordmark @critical', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.header.wordmark).toHaveText('christian.rent');
  });
});
