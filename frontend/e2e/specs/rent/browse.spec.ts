// Acceptance Test
// Traces to: L2-001, L2-022, L2-029
// Description: Browse shows approved listings, newest first, as the default mock draws them.
import { answerPhotos, cast, forRent, page as listingsPage, wanted } from '../../fixtures/listings';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';

test.describe('Browse', () => {
  // L2-001 criteria 1, 3, 4, 7, 8 and 10; L2-022 criteria 1 and 3.
  test('shows approved listings newest first, as cards for rent and wanted @critical', async ({
    page,
    api,
  }) => {
    const listings = cast();
    api.answer('GET', '/api/listings', { body: listingsPage(listings) });
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.cards).toHaveCount(7);
    await expect(browse.count).toHaveText('7 listings');
    const titles = await browse.cards.getByRole('heading', { level: 2 }).allTextContents();
    expect(titles.map((title) => title.trim())).toEqual(listings.map((listing) => listing.title));

    const room = browse.cardTitled('Quiet guest room, month to month');
    await expect(room.link).toHaveAttribute('href', `/listings/${listings[0]!.id}`);
    await expect(room.photo).toHaveAttribute(
      'alt',
      'A guest room with a made bed, a wooden desk and a window with a plant',
    );
    await expect(room.photo).toHaveJSProperty('complete', true);
    await expect(room.tag).toHaveText('space');
    await expect(room.price).toHaveText('$850 / month');
    await expect(room.place).toHaveText('Walnut Grove, Langley');
    await expect(room.church).toHaveText('Willoughby Baptist');

    const office = browse.cardTitled('Small office for weekly counselling');
    await expect(office.photo).toHaveCount(0);
    await expect(office.tag).toHaveText('Wanted · space');
    await expect(office.when).toHaveText('Tuesdays and Thursdays');
    await expect(office.poster).toHaveText('Dr. Alicia Gomez');
    await expect(office.price).toHaveText('Up to $300 / month');
    await expect(office.place).toHaveText('Fort Langley');
    await expect(office.church).toHaveText('St. Paul’s Anglican');

    await expect(browse.cardTitled('15-passenger van for youth camp').when).toHaveText(
      'Jul 14 to 18, 2026',
    );
    const chairs = browse.cardTitled('120 white folding chairs');
    await expect(chairs.when).toHaveText('Sat, Aug 8, 2026');
    await expect(chairs.price).toHaveCount(0);
  });

  // L2-001 criterion 10: one listing is "1 listing".
  test('announces a single listing in the singular', async ({ page, api }) => {
    api.answer('GET', '/api/listings', { body: listingsPage([wanted('Chairs')]) });
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.count).toHaveText('1 listing');
  });

  // L2-029 criterion 3: the photo is sized to the card and its space is reserved.
  test('reserves each photo’s 4:3 box and loads photos below the fold lazily', async ({
    page,
    api,
  }) => {
    const listings = Array.from({ length: 12 }, (_, i) => forRent(`Hall ${i + 1}`));
    api.answer('GET', '/api/listings', { body: listingsPage(listings) });
    answerPhotos(api);
    await page.setViewportSize({ width: 1280, height: 800 });
    const browse = new BrowsePage(page);

    await browse.open();

    const first = browse.card(0).photo;
    await expect(first).toHaveAttribute('width', '800');
    await expect(first).toHaveAttribute('height', '600');
    await expect(first).toHaveAttribute('fetchpriority', 'high');
    await expect(browse.card(11).photo).toHaveAttribute('loading', 'lazy');
    const box = await browse.card(0).root.locator('.listing-card__media').boundingBox();
    expect(Math.round((box!.width / box!.height) * 3)).toBe(4);
  });
});
