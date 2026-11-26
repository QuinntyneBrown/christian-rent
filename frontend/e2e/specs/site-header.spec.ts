import { answerNoListings } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

test.describe('The site header', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-036 criteria 1 and 5; L2-023.
  test('shows the wordmark leading to Browse and a Post button, and nothing else', async ({
    page,
  }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.logo).toHaveAccessibleName('christian.rent home');
    await expect(browse.header.logo).toHaveAttribute('href', '/');
    await expect(browse.header.post).toHaveAttribute('href', '/post');
    await expect(browse.header.controls).toHaveCount(2);
    await expect(browse.header.messages).toHaveCount(0);
    await expect(browse.header.signIn).toHaveCount(0);
  });

  // L2-023: ".rent" is in the brand orange.
  test('writes ".rent" in orange', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.wordmarkTld).toHaveText('.rent');
    await expect(browse.header.wordmarkTld).toHaveCSS('color', 'rgb(255, 107, 61)');
  });

  // L2-031 criterion 6: every touch target is at least 44 × 44 px.
  test('gives every control a touch target of at least 44 × 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const browse = new BrowsePage(page);
    await browse.open();

    for (const control of await browse.header.controls.all()) {
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  // L2-031 criterion 1: nothing is cut off and nothing scrolls sideways from 320 px.
  test('does not scroll sideways at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.wordmark).toBeInViewport({ ratio: 1 });
    await expect(browse.header.post).toBeInViewport({ ratio: 1 });
    expect(await browse.scrollsSideways()).toBe(false);
  });
});

test.describe('The skip link', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-032 criterion 8: the first control is "Skip to content", and it leads to the content.
  test('is the first control and moves focus to the content', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await page.keyboard.press('Tab');
    await expect(browse.skipLink).toBeFocused();
    await expect(browse.skipLink).toHaveText('Skip to content');
    await expect(browse.skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(browse.main).toBeFocused();
  });
});
