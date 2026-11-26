// Acceptance Test
// Traces to: L2-004, L2-003, L2-026
// Description: A search that finds nothing names the term, offers to ask for it on Post as a
// wanted listing, and offers to clear the search.
import { answerListings, answerPhotos, cast } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

test.describe('A search that finds nothing', () => {
  // L2-004 criteria 1 and 2.
  test('names the term and offers to ask for it as a wanted listing', async ({ page, api }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.openAt('/?q=hot%20air%20balloon');

    await expect(browse.noResultsTitle).toHaveText('Nobody has “hot air balloon” yet.');
    await expect(browse.noResults).toContainText(
      'Post a request and the people near Langley who can help will see it.',
    );
    await expect(browse.count).toHaveText('No listings match “hot air balloon”.');
    await expect(browse.cards).toHaveCount(0);
    await expect(browse.switchCount('Everything')).toHaveText('0');
    await expect(browse.askFor).toHaveText('Ask for “hot air balloon”');
    await expect(browse.askFor).toHaveClass(/btn--wanted/);

    await browse.askFor.click();

    await expect(page).toHaveURL('/post?offer=wanted&title=hot%20air%20balloon');
  });

  // L2-004 criterion 3: Clear search empties the term and shows the list again, keeping the
  // switch.
  test('clears the search and shows the list again', async ({ page, api }) => {
    answerListings(api, cast());
    answerPhotos(api);
    const browse = new BrowsePage(page);
    await browse.openAt('/?show=wanted&q=hot%20air%20balloon');
    await expect(browse.noResultsTitle).toBeVisible();

    await browse.clearSearch.click();

    await expect(browse.cards).toHaveCount(3);
    await expect(browse.searchField).toHaveValue('');
    await expect(browse.switchCurrent).toHaveText(/^Wanted/);
    expect(browse.query()).toBe('?show=wanted');
  });

  // L2-003 criterion 5; L2-026 criterion 1: the term is rendered as text and nothing runs.
  test('renders a term holding HTML as text', async ({ page, api }) => {
    answerListings(api, cast());
    const term = '<img src=x onerror="document.body.dataset.ran=1">';
    const browse = new BrowsePage(page);

    await browse.openAt(`/?q=${encodeURIComponent(term)}`);

    await expect(browse.noResultsTitle).toHaveText(`Nobody has “${term}” yet.`);
    await expect(browse.askFor).toHaveText(`Ask for “${term}”`);
    await expect(browse.searchField).toHaveValue(term);
    await expect(browse.main.locator('img[src="x"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.dataset['ran'])).toBeUndefined();
  });

  // ADR 0015: with no term, a choice that holds nothing shows the empty state.
  test('shows the empty state when a choice holds nothing and there is no term', async ({
    page,
    api,
  }) => {
    answerListings(
      api,
      cast().filter((listing) => listing.offer === 'for-rent'),
    );
    answerPhotos(api);
    const browse = new BrowsePage(page);

    await browse.openAt('/?show=wanted');

    await expect(browse.emptyTitle).toHaveText('Nothing is posted near Langley yet.');
    await expect(browse.askFor).toHaveCount(0);
    await expect(browse.switchCount('For rent')).toHaveText('4');
  });
});
