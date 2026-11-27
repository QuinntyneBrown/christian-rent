// Acceptance Test
// Traces to: L2-035, L2-032
// Description: The kind filter narrows Browse to spaces, to things or both, together with the
// switch and the search term, and keeps its choice in the address.
import { answerListings, answerPhotos, cast } from '../../fixtures/listings';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';

test.describe('The kind filter on Browse', () => {
  // L2-035 criteria 1, 2 and 4: All first; Spaces or Things, each a button whose state says so.
  test('shows both kinds first, then only spaces or only things', async ({ page, api }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.kindPressed).toHaveText('All');
    await expect(browse.kindOption('Spaces')).toHaveAttribute('aria-pressed', 'false');
    await expect(browse.cards).toHaveCount(7);

    await browse.kindOption('Spaces').click();

    await expect(browse.kindPressed).toHaveText('Spaces');
    await expect(browse.kindOption('All')).toHaveAttribute('aria-pressed', 'false');
    await expect(browse.cards).toHaveCount(3);
    await expect(browse.switchCount('Everything')).toHaveText('3');
    await expect(browse.switchCount('For rent')).toHaveText('2');
    await expect(browse.switchCount('Wanted')).toHaveText('1');
    await expect(browse.count).toHaveText('3 listings');
    expect(browse.query()).toBe('?kind=space');

    await browse.kindOption('Things').click();

    await expect(browse.cards).toHaveCount(4);
    await expect(browse.cardTitled('Pressure washer and drill kit').tag).toHaveText('thing');
  });

  // L2-035 criteria 3 and 5: all three apply together and come back with the address.
  test('applies with the switch and the term, and is restored from the address', async ({
    page,
    api,
  }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.openAt('/?show=wanted&kind=thing&q=langley');

    await expect(browse.kindPressed).toHaveText('Things');
    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
    await expect(browse.searchField).toHaveValue('langley');
    await expect(browse.cards).toHaveCount(1);
    await expect(browse.cardTitled('15-passenger van for youth camp').link).toBeVisible();

    await browse.switchOption('For rent').click();

    await expect(browse.kindPressed).toHaveText('Things');
    await expect(browse.cards).toHaveCount(1);
    await expect(browse.cardTitled('Pressure washer and drill kit').link).toBeVisible();
    expect(browse.query()).toBe('?show=for-rent&kind=thing&q=langley');
  });

  // L2-035 criterion 4; L2-032 criterion 2: by keyboard, with focus kept on the control.
  test('is pressed with the keyboard and keeps focus', async ({ page, api }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(7);

    await browse.kindOption('Things').focus();
    await page.keyboard.press('Space');

    await expect(browse.kindPressed).toHaveText('Things');
    await expect(browse.cards).toHaveCount(4);
    await expect(browse.kindOption('Things')).toBeFocused();
  });
});
