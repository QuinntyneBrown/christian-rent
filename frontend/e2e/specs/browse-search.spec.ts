// Acceptance Test
// Traces to: L2-002, L2-003
// Description: The search bar narrows Browse by words, waits for typing to pause, applies
// together with the switch, and keeps the term in the address.
import { answerListings, answerPhotos, cast } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

const notes = { 'Sunlit fellowship hall for 80': 'Parking for twenty cars beside the gymnasium.' };

function listingRequests(requests: readonly string[]): string[] {
  return requests.filter((request) => request.startsWith('GET /api/listings'));
}

test.describe('Searching Browse', () => {
  // L2-003 criteria 6 and 7.
  test('has a field named Search listings, a Search button and the area as text', async ({
    page,
    api,
  }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.searchField).toHaveAttribute('maxlength', '100');
    await expect(browse.searchField).toHaveAttribute(
      'placeholder',
      'Fellowship hall, guest room, trailer…',
    );
    await expect(browse.searchButton).toBeVisible();
    await expect(browse.searchArea).toHaveText('Langley, BC');
    await expect(browse.searchArea.getByRole('link')).toHaveCount(0);
    await expect(browse.searchArea.getByRole('button')).toHaveCount(0);
  });

  // L2-003 criteria 1 to 3; L2-002 criterion 5: one request once typing pauses, the term in
  // the address.
  test('finds listings by their words once typing pauses @critical', async ({ page, api }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(7);

    await browse.type('GYMNASIUM');

    await expect(browse.searchField).toHaveValue('GYMNASIUM');
    await expect(browse.cards).toHaveCount(1);
    await expect(browse.cardTitled('Sunlit fellowship hall for 80').link).toBeVisible();
    await expect(browse.count).toHaveText('1 listing');
    await expect(browse.switchCount('Everything')).toHaveText('1');
    expect(browse.query()).toBe('?q=GYMNASIUM');
    expect(listingRequests(api.requests)).toEqual([
      'GET /api/listings',
      'GET /api/listings?q=GYMNASIUM',
    ]);
  });

  // L2-003 criterion 6: Enter, or Search, searches for the term as typed.
  test('searches at once on Enter and on Search', async ({ page, api }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await browse.searchField.fill('folding');
    await browse.searchField.press('Enter');
    await expect(browse.cards).toHaveCount(1);
    await expect(browse.cardTitled('120 white folding chairs').link).toBeVisible();

    await browse.searchField.fill('langley');
    await browse.searchButton.click();
    await expect(browse.cards).toHaveCount(5);
    expect(browse.query()).toBe('?q=langley');
  });

  // L2-002 criteria 4 and 5: the term and the switch apply together and come back with the
  // address.
  test('keeps the term when the switch changes, and restores both from the address', async ({
    page,
    api,
  }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.openAt('/?q=langley');

    await expect(browse.searchField).toHaveValue('langley');
    await expect(browse.cards).toHaveCount(5);
    await expect(browse.switchCount('Wanted')).toHaveText('2');

    await browse.switchOption('Wanted').click();

    await expect(browse.cards).toHaveCount(2);
    await expect(browse.searchField).toHaveValue('langley');
    expect(browse.query()).toBe('?show=wanted&q=langley');

    await page.reload();

    await expect(browse.searchField).toHaveValue('langley');
    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
    await expect(browse.cards).toHaveCount(2);
  });

  // L2-032 criterion 2: a change of the query is not a new screen; focus stays where it is.
  test('keeps focus in the field and on the switch when the query changes', async ({
    page,
    api,
  }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(7);

    await browse.type('hall');
    await expect(browse.cards).toHaveCount(1);
    await expect(browse.searchField).toBeFocused();

    await browse.switchOption('For rent').focus();
    await page.keyboard.press('Enter');
    await expect(browse.switchCurrent).toHaveText(/^For rent/);
    await expect(browse.switchOption('For rent')).toBeFocused();
  });

  // design-system search-bar.html: Escape empties the field, and the list shows everything.
  test('empties the field with Escape and shows every listing again', async ({ page, api }) => {
    answerListings(api, cast(), notes);
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.openAt('/?q=folding');
    await expect(browse.cards).toHaveCount(1);

    await browse.searchField.press('Escape');

    await expect(browse.searchField).toHaveValue('');
    await expect(browse.cards).toHaveCount(7);
    expect(browse.query()).toBe('');
  });
});
