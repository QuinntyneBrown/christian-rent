// Acceptance Test
// Traces to: L2-006, L2-030
// Description: Browse loads more listings as the end of the list is reached, and keeps a bounded window of pages.
import type { ApiFixtures } from '../fixtures/api';
import { answerPhotos, many, page as listingsPage } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

/** Answers `pages` pages of 24 (the last may be shorter), each requested by the cursor `p<n>`. */
function answerPages(api: ApiFixtures, sizes: number[]): void {
  const pages = sizes.map((size, index) =>
    listingsPage(
      many(
        size,
        sizes.slice(0, index).reduce((sum, n) => sum + n, 1),
      ),
      index + 1 < sizes.length ? `p${index + 2}` : null,
      { everything: sizes.reduce((sum, n) => sum + n, 0), forRent: 0, wanted: 0 },
    ),
  );
  api.answer('GET', '/api/listings', (url) => {
    const cursor = url.searchParams.get('cursor');
    const index = cursor === null ? 0 : Number(cursor.slice(1)) - 1;
    return pages[index] ? { body: pages[index] } : undefined;
  });
  answerPhotos(api);
}

function listingRequests(api: ApiFixtures): string[] {
  return api.requests.filter((request) => request.startsWith('GET /api/listings'));
}

test.describe('Browse, further down the list', () => {
  // L2-006 criteria 1 and 2.
  test('loads the next 24 at the end of the list, and nothing after the last page', async ({
    page,
    api,
  }) => {
    answerPages(api, [24, 6]);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(24);
    await expect(browse.count).toHaveText('30 listings');

    await browse.scrollToEnd();

    await expect(browse.cards).toHaveCount(30);
    await expect(browse.cardTitled('Listing 30').link).toBeAttached();
    await browse.scrollToEnd();
    await expect(browse.feedStatus).toHaveCount(0);
    expect(listingRequests(api)).toEqual(['GET /api/listings', 'GET /api/listings?cursor=p2']);
  });

  // L2-006 criterion 4.
  test('shows and announces "Loading more listings" while the next page is in flight', async ({
    page,
    api,
  }) => {
    answerPages(api, [24, 24]);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(24);
    const release = api.hold('GET', '/api/listings');

    await browse.scrollToEnd();

    await expect(browse.feedStatus).toHaveRole('status');
    await expect(browse.feedStatus).toHaveText('Loading more listings…');
    await expect(browse.count).toHaveText('Loading more listings');
    release();
    await expect(browse.cards).toHaveCount(48);
    await expect(browse.feedStatus).toHaveCount(0);
  });

  // L2-006 criterion 3.
  test('keeps the listings shown when the next page fails, and Try again loads it', async ({
    page,
    api,
  }) => {
    answerPages(api, [24, 6]);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(24);
    api.refuse('GET', '/api/listings', 503, 'unexpected');

    await browse.scrollToEnd();

    await expect(browse.feedStatus).toHaveRole('alert');
    await expect(browse.feedStatus).toContainText('We couldn’t load more listings.');
    await expect(browse.cards).toHaveCount(24);

    answerPages(api, [24, 6]);
    await browse.loadMoreAgain.click();

    await expect(browse.cards).toHaveCount(30);
    await expect(browse.feedStatus).toHaveCount(0);
  });

  // L2-030 criterion 4: listings far off screen are released, and come back on the way up.
  test('holds at most 72 listings however far the list goes, and brings them back', async ({
    page,
    api,
  }) => {
    answerPages(api, [24, 24, 24, 24, 24]);
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(24);

    for (const last of [48, 72, 96, 120]) {
      await browse.scrollToEnd();
      await expect(browse.cardTitled(`Listing ${last}`).link).toBeAttached();
      expect(await browse.cards.count()).toBeLessThanOrEqual(72);
    }
    await expect(browse.cardTitled('Listing 120').link).toBeAttached();
    await expect(browse.cardTitled('Listing 1').link).toHaveCount(0);
    expect(await browse.cards.count()).toBe(72);

    await browse.scrollToTop();

    await expect(browse.cardTitled('Listing 1').link).toBeAttached();
    await expect(browse.cardTitled('Listing 120').link).toHaveCount(0);
    expect(await browse.cards.count()).toBeLessThanOrEqual(72);
    expect(listingRequests(api).filter((request) => request === 'GET /api/listings')).toHaveLength(
      2,
    );
  });
});
