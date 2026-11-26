import { answerNoListings } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { NotFoundPage } from '../pages/not-found.page';

test.describe('An address that matches no screen', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-033 criterion 3; L2-036 criterion 1.
  test('shows "not found" with the header and a way back to Browse @critical', async ({ page }) => {
    const notFound = new NotFoundPage(page);

    await notFound.open('/no-such-page');

    await expect(notFound.heading).toHaveText('We can’t find that page.');
    await expect(notFound.text).toHaveText('The link may be wrong, or the page may have moved.');
    await expect(notFound.header.wordmark).toHaveText('christian.rent');
    await expect(notFound.header.post).toBeVisible();
    await expect(page).toHaveTitle('Page not found · christian.rent');
  });

  // L2-033 criterion 3; L2-032 criterion 2: focus follows the screen.
  test('leads back to Browse and moves focus to its heading', async ({ page }) => {
    const notFound = new NotFoundPage(page);
    const browse = new BrowsePage(page);
    await notFound.open('/listings/1/nothing/here');

    await notFound.goToBrowse.click();

    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Browse · christian.rent');
    await expect(browse.heading).toBeFocused();
  });
});
