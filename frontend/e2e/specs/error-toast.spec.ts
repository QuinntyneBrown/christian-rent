import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { ErrorToastPart } from '../pages/error-toast.part';

test.describe('An unexpected error in the browser', () => {
  test.use({ expectedPageErrors: ['A bug nobody caught'] });

  // L2-033 criterion 7; L2-032 criterion 4.
  test('shows an announced toast that offers to reload, and sends nothing away', async ({
    page,
  }) => {
    const browse = new BrowsePage(page);
    const toast = new ErrorToastPart(page);
    await browse.open();

    await toast.raiseUnexpectedError('A bug nobody caught');

    await expect(toast.toast).toHaveRole('alert');
    await expect(toast.title).toHaveText('Something went wrong');
    await expect(toast.text).toHaveText(
      'This page ran into a problem. Reloading it usually helps.',
    );
    await expect(toast.reload).toBeVisible();
    await expect(toast.toast).not.toContainText('A bug nobody caught');
    await expect(toast.toast).toHaveCount(1);
  });

  test('shows one toast however many errors arrive, and Dismiss closes it', async ({ page }) => {
    const browse = new BrowsePage(page);
    const toast = new ErrorToastPart(page);
    await browse.open();

    await toast.raiseUnexpectedError('A bug nobody caught');
    await toast.raiseUnexpectedError('A bug nobody caught');
    await expect(toast.toast).toHaveCount(1);

    await toast.dismiss.click();
    await expect(toast.toast).toHaveCount(0);
  });

  test('Reload reloads the page', async ({ page }) => {
    const browse = new BrowsePage(page);
    const toast = new ErrorToastPart(page);
    await browse.open();
    await toast.raiseUnexpectedError('A bug nobody caught');

    await Promise.all([page.waitForEvent('load'), toast.reload.click()]);

    await expect(toast.toast).toHaveCount(0);
    await expect(browse.header.wordmark).toBeVisible();
  });
});
