// Acceptance Test
// Traces to: L2-007, L2-025, L2-031, L2-033
// Description: Listing while it loads, when it fails, when there is no listing to show, and its layout from phone to desktop.
import { answerPhotos, cast, page as listingsPage } from '../fixtures/listings';
import { answerListing, hall } from '../fixtures/listing';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { ListingPage } from '../pages/listing.page';

test.describe('Listing while it waits, fails or finds nothing', () => {
  // L2-033 criterion 1: a loading state in the shape of the listing, announced.
  test('shows the listing’s skeleton while it is slow', async ({ page, api }) => {
    const listing = hall();
    const release = api.hold('GET', `/api/listings/${listing.id}`);
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.skeleton).toBeVisible();
    await expect(screen.messageBoxSkeleton).toBeVisible();
    await expect(screen.main).toHaveAttribute('aria-busy', 'true');
    await expect(screen.status).toHaveText('Loading listing');
    await expect(screen.allListings).toBeVisible();

    release();

    await expect(screen.heading).toHaveText('Sunlit fellowship hall for 80');
    await expect(screen.skeleton).toHaveCount(0);
    await expect(screen.main).not.toHaveAttribute('aria-busy', 'true');
  });

  // L2-033 criterion 5: an answer within 300 ms shows no loading state.
  test('shows no skeleton when the listing answers at once', async ({ page, api }) => {
    const listing = hall();
    answerListing(api, listing);
    const screen = new ListingPage(page);
    let skeletons = 0;
    await page.exposeFunction('skeletonSeen', () => skeletons++);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector('.listing--loading')) {
          (window as unknown as { skeletonSeen: () => void }).skeletonSeen();
        }
      }).observe(document, { childList: true, subtree: true });
    });

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText('Sunlit fellowship hall for 80');
    expect(skeletons).toBe(0);
  });

  // L2-007 criterion 4; L2-025 criterion 2: no listing anyone may see; nothing about it shown.
  test('says the listing isn’t here, and leads back to Browse', async ({ page, api }) => {
    api.refuse('GET', '/api/listings/1157a000-0008-4000-8000-000000000008', 404, 'not_found');
    api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    answerPhotos(api);
    const screen = new ListingPage(page);

    await screen.open('1157a000-0008-4000-8000-000000000008');

    await expect(screen.heading).toHaveText('This listing isn’t here.');
    await expect(screen.plainText).toHaveText(
      'It may have been taken down, or the link may be wrong. Nothing else is known about it.',
    );
    await expect(page).toHaveTitle('Listing not found · christian.rent');
    await expect(screen.status).toHaveText('This listing isn’t here.');
    await expect(screen.allListings).toHaveCount(0);

    await screen.browseAllListings.click();

    await expect(page).toHaveURL('/');
    await expect(new BrowsePage(page).cards).toHaveCount(7);
  });

  // L2-033 criterion 2: a plain message and "Try again", and no technical detail.
  test('says plainly that the listing could not be loaded, and Try again loads it', async ({
    page,
    api,
  }) => {
    const listing = hall();
    api.refuse('GET', `/api/listings/${listing.id}`, 503, 'unexpected');
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText('We couldn’t load this listing.');
    await expect(screen.plainText).toHaveText('Check your connection and try again.');
    await expect(screen.plainPage.getByRole('link', { name: 'All listings' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(screen.main).not.toContainText('503');
    await expect(screen.main).not.toContainText('unexpected');

    answerListing(api, listing);
    await screen.tryAgain.click();

    await expect(screen.heading).toHaveText('Sunlit fellowship hall for 80');
  });

  // Lazy loading and memory: leaving while the listing loads abandons its request.
  test('abandons the request when the person leaves before it answers', async ({ page, api }) => {
    const listing = hall();
    api.hold('GET', `/api/listings/${listing.id}`);
    answerListing(api, listing);
    api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    answerPhotos(api);
    const screen = new ListingPage(page);
    const abandoned = page.waitForEvent(
      'requestfailed',
      (request) => new URL(request.url()).pathname === `/api/listings/${listing.id}`,
    );

    await screen.open(listing.id);
    await expect(screen.status).toHaveText('Loading listing');
    await screen.allListings.click();

    await expect(new BrowsePage(page).cards).toHaveCount(7);
    expect((await abandoned).failure()?.errorText).toBe('net::ERR_ABORTED');
  });
});

test.describe('Listing at every width', () => {
  // L2-031 criterion 3: the message box under the listing below 768 px, to its right from 768 px.
  test('puts the message box under the listing on a phone and beside it from 768 px', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await page.setViewportSize({ width: 767, height: 900 });
    await screen.open(listing.id);
    await expect(screen.messageBox).toBeVisible();
    const article = (await screen.listing.boundingBox())!;
    let box = (await screen.messageBox.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(article.y + article.height);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect
      .poll(async () => (await screen.messageBox.boundingBox())!.x)
      .toBeGreaterThan(article.x + 300);
    box = (await screen.messageBox.boundingBox())!;
    const beside = (await screen.listing.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(beside.x + beside.width);
    expect(box.y).toBeLessThan(beside.y + beside.height);
    expect(await screen.scrollsSideways()).toBe(false);
  });

  // L2-031 criterion 6: every control's touch target is at least 44 × 44 px.
  test('gives the back link and every thumbnail a target of at least 44 × 44 px', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    const screen = new ListingPage(page);
    await page.setViewportSize({ width: 375, height: 800 });

    await screen.open(listing.id);
    await expect(screen.gallery.thumbs).toHaveCount(3);

    for (const control of [screen.allListings, ...(await screen.gallery.thumbs.all())]) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
