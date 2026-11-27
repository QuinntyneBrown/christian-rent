// Acceptance Test
// Traces to: L2-001, L2-033
// Description: Browse's loading, empty and error states, as their mocks draw them.
import { answerPhotos, cast, page as listingsPage } from '../../fixtures/listings';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';

test.describe('Browse while it waits, finds nothing or fails', () => {
  // L2-033 criterion 1: a loading state in the shape of what will arrive.
  test('shows skeleton cards and announces the wait while the first page is slow', async ({
    page,
    api,
  }) => {
    const release = api.hold('GET', '/api/listings');
    api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.skeletons.first()).toBeVisible();
    expect(await browse.skeletons.count()).toBeGreaterThanOrEqual(4);
    await expect(browse.count).toHaveText('Loading listings');
    await expect(browse.haveSomethingToRent).toBeVisible();

    release();

    await expect(browse.cards).toHaveCount(7);
    await expect(browse.skeletons).toHaveCount(0);
    await expect(browse.count).toHaveText('7 listings');
  });

  // L2-001 criterion 6: nothing approved yet; the two buttons that lead to posting.
  test('offers to post when nothing is listed yet', async ({ page, api }) => {
    api.answer('GET', '/api/listings', { body: listingsPage([]) });
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.emptyTitle).toHaveText('Nothing is posted near Langley yet.');
    await expect(browse.empty).toContainText(
      'Be the first. Post a space or a thing you can rent out, or ask for what you need.',
    );
    await expect(browse.emptyHaveSomethingToRent).toHaveAttribute('href', '/post?offer=for-rent');
    await expect(browse.emptyLookingForSomething).toHaveAttribute('href', '/post?offer=wanted');
    await expect(browse.count).toHaveText('No listings yet');
    await expect(browse.cards).toHaveCount(0);
  });

  // L2-033 criteria 2 and 6: a plain message and "Try again"; the header and the headline stay.
  test('says plainly that the listings could not be loaded, and Try again loads them', async ({
    page,
    api,
  }) => {
    api.refuse('GET', '/api/listings', 503, 'unexpected');
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.errorTitle).toHaveText('We couldn’t load the listings.');
    await expect(browse.errorText).toHaveText(
      'Check your connection and try again. Nothing you typed is lost.',
    );
    await expect(browse.count).toHaveText('We couldn’t load the listings.');
    await expect(browse.header.wordmark).toBeVisible();
    await expect(browse.heading).toBeVisible();
    await expect(browse.error).not.toContainText('503');

    api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    answerPhotos(api);
    await browse.tryAgain.click();

    await expect(browse.cards).toHaveCount(7);
    await expect(browse.error).toHaveCount(0);
  });
});
