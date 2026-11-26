// Acceptance Test
// Traces to: L2-002, L2-032
// Description: The switch narrows Browse to Everything, For rent or Wanted, shows what each
// holds, and keeps the choice in the address.
import { answerListings, answerPhotos, cast, page as listingsPage } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

test.describe('The switch on Browse', () => {
  // L2-002 criteria 1 to 3 and 6; L2-032 criterion 3: the choice is aria-current.
  test('shows everything first, then only what is for rent or wanted, with counts', async ({
    page,
    api,
  }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.cards).toHaveCount(7);
    await expect(browse.switchCurrent).toHaveText(/^Everything/);
    await expect(browse.switchCount('Everything')).toHaveText('7');
    await expect(browse.switchCount('For rent')).toHaveText('4');
    await expect(browse.switchCount('Wanted')).toHaveText('3');

    await browse.switchOption('For rent').click();

    await expect(browse.cards).toHaveCount(4);
    await expect(browse.switchCurrent).toHaveText(/^For rent/);
    await expect(browse.switchOption('Everything')).toHaveAttribute('aria-current', 'false');
    await expect(browse.count).toHaveText('4 listings for rent');
    expect(browse.query()).toBe('?show=for-rent');

    await browse.switchOption('Wanted').click();

    await expect(browse.cards).toHaveCount(3);
    await expect(browse.count).toHaveText('3 wanted listings');
    await expect(browse.cardTitled('15-passenger van for youth camp').tag).toHaveText(
      'Wanted · thing',
    );
    await expect(browse.switchCount('For rent')).toHaveText('4');
  });

  // L2-002 criterion 5: a reload or a shared link restores the choice; back returns to the last.
  test('restores the choice from the address, and back returns to the one before', async ({
    page,
    api,
  }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.openAt('/?show=wanted');

    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
    await expect(browse.cards).toHaveCount(3);

    await browse.switchOption('For rent').click();
    await expect(browse.cards).toHaveCount(4);

    await browse.goBack();

    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
    await expect(browse.cards).toHaveCount(3);
    expect(api.requests.filter((request) => request.startsWith('GET /api/listings'))).toEqual([
      'GET /api/listings?show=wanted',
      'GET /api/listings?show=for-rent',
      'GET /api/listings?show=wanted',
    ]);
  });

  // L2-002 criterion 6: no number while the list is loading or has failed.
  test('shows no count while the list loads or after it failed', async ({ page, api }) => {
    const release = api.hold('GET', '/api/listings');
    api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.switchOptions).toHaveCount(3);
    await expect(browse.switchCount('Everything')).toHaveText('');
    release();
    await expect(browse.switchCount('Everything')).toHaveText('7');

    api.refuse('GET', '/api/listings', 503, 'unexpected');
    await browse.switchOption('Wanted').click();

    await expect(browse.errorTitle).toHaveText('We couldn’t load the listings.');
    await expect(browse.switchCount('Everything')).toHaveText('');
    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
  });
});
