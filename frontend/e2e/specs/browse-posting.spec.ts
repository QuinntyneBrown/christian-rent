// Acceptance Test
// Traces to: L2-001, L2-005, L2-031
// Description: Browse leads straight to posting, keeping the choice in the address, and a card leads to its listing.
import { answerNoListings, answerPhotos, cast, page as listingsPage } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

test.describe('Browse leads to posting', () => {
  // L2-005 criteria 1 and 2.
  test('"I have something to rent" opens Post set to "I have"', async ({ page, api }) => {
    answerNoListings(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await browse.haveSomethingToRent.click();

    await expect(page).toHaveURL('/post?offer=for-rent');
  });

  // L2-005 criterion 3; L2-032: by keyboard as well as by touch.
  test('"I’m looking for something" opens Post set to "I need", by keyboard', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await browse.lookingForSomething.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL('/post?offer=wanted');
  });

  // L2-031 criterion 6.
  test('gives both buttons a touch target of at least 44 × 44 px on a phone', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    await page.setViewportSize({ width: 320, height: 640 });
    const browse = new BrowsePage(page);
    await browse.open();

    for (const button of [browse.haveSomethingToRent, browse.lookingForSomething]) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  // L2-001 criterion 5: selecting a card opens its listing (the Listing screen is journey 4).
  test('a card leads to its listing', async ({ page, api }) => {
    const listings = cast();
    api.answer('GET', '/api/listings', { body: listingsPage(listings) });
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await browse.cardTitled('Small office for weekly counselling').link.click();

    await expect(page).toHaveURL(`/listings/${listings[1]!.id}`);
  });
});
