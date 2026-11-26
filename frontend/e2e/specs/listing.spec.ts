// Acceptance Test
// Traces to: L2-001, L2-007, L2-022, L2-024
// Description: Listing shows an approved listing for rent, its photos and price, as the default mock draws it.
import { answerPhotos, cast, page as listingsPage } from '../fixtures/listings';
import { answerListing, gym, hall } from '../fixtures/listing';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { ListingPage } from '../pages/listing.page';

test.describe('Listing', () => {
  // L2-007 criteria 1, 5, 6 and 8; L2-022 criteria 1 and 9; L2-024 criterion 2.
  test('shows a listing for rent with its photos, facts, note and price @critical', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText('Sunlit fellowship hall for 80');
    await expect(page).toHaveTitle('Sunlit fellowship hall for 80 · christian.rent');
    await expect(screen.tag).toHaveText('For rent · space');
    await expect(screen.facts).toHaveText([
      'Langley',
      'Weekdays and Saturdays',
      'Posted 2 days ago',
    ]);
    await expect(screen.note).toHaveText(listing.note!);
    await expect(screen.gallery.photo).toHaveAttribute(
      'alt',
      'A bright hall with round tables, folding chairs and tall arched windows',
    );
    await expect(screen.gallery.photo).toHaveJSProperty('complete', true);
    await expect(screen.messageBoxHeading).toHaveText('Message Dan about this listing');
    await expect(screen.eyebrow).toHaveText('Rent for');
    await expect(screen.price).toHaveText('$45 CAD / hour');
    // No booking calendar: the listing has no date control, and the message box's dates are
    // two plain fields that reserve nothing (L2-024, criterion 2).
    await expect(screen.listing.locator('input, [role="grid"]')).toHaveCount(0);
    await expect(screen.main.locator('[role="grid"]')).toHaveCount(0);
    await expect(screen.allListings).toHaveAttribute('href', '/');
  });

  // L2-007 criteria 3 and 7: each photo by touch and by keyboard, named by its position, the
  // one shown marked and announced; a photo with no description is described by the title.
  test('steps through the photos by touch and by keyboard', async ({ page, api }) => {
    const listing = hall();
    answerListing(api, listing);
    const screen = new ListingPage(page);
    const gallery = screen.gallery;

    await screen.open(listing.id);

    await expect(gallery.thumbs).toHaveCount(3);
    await expect(gallery.thumb(1, 3)).toHaveAttribute('aria-current', 'true');
    await expect(gallery.thumb(2, 3)).toHaveAttribute('aria-current', 'false');
    await expect(gallery.thumbs.locator('img[alt=""]')).toHaveCount(3);
    await expect(gallery.count).toHaveText('Photo 1 of 3');
    await expect(gallery.count).toHaveAttribute('aria-live', 'polite');

    await gallery.thumb(2, 3).click();

    await expect(gallery.thumb(2, 3)).toHaveAttribute('aria-current', 'true');
    await expect(gallery.thumb(1, 3)).toHaveAttribute('aria-current', 'false');
    await expect(gallery.count).toHaveText('Photo 2 of 3');
    await expect(gallery.photo).toHaveAttribute(
      'alt',
      'Sunlit fellowship hall for 80, photo 2 of 3',
    );

    await page.keyboard.press('ArrowRight');

    await expect(gallery.thumb(3, 3)).toBeFocused();
    await expect(gallery.count).toHaveText('Photo 3 of 3');
    await expect(gallery.photo).toHaveAttribute(
      'alt',
      'Round tables and folding chairs beside a row of tall arched windows',
    );

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(gallery.thumb(1, 3)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(gallery.thumb(2, 3)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(gallery.count).toHaveText('Photo 2 of 3');
  });

  // L2-007 criterion 9; L2-022 criteria 1 and 6: one photo shows alone; a price with cents.
  test('shows a single photo alone, and the edge mock’s long words wrap', async ({ page, api }) => {
    const listing = gym();
    answerListing(api, listing);
    const screen = new ListingPage(page);
    await page.setViewportSize({ width: 320, height: 800 });

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText(listing.title);
    await expect(screen.gallery.photo).toBeVisible();
    await expect(screen.gallery.thumbs).toHaveCount(0);
    await expect(screen.gallery.count).toHaveCount(0);
    await expect(screen.note).toHaveCount(0);
    await expect(screen.facts.last()).toHaveText('Posted 3 weeks ago');
    await expect(screen.price).toHaveText('$1,250.50 CAD / week');
    expect(await screen.scrollsSideways()).toBe(false);
  });

  // L2-007 criterion 9: a listing for rent with no photo says so in the photo's place.
  test('shows “No photo yet” for a listing for rent without a photo', async ({ page, api }) => {
    const listing = hall({ photos: [] });
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.gallery.noPhoto).toHaveAccessibleName('No photo yet');
    await expect(screen.gallery.photo).toHaveCount(0);
  });

  // L2-001 criterion 5; L2-007 criterion 8: a card opens its listing, and "All listings" leads
  // back to Browse.
  test('opens from a card on Browse and leads back to it', async ({ page, api }) => {
    const cards = cast();
    const listing = hall({ id: cards[3]!.id });
    api.answer('GET', '/api/listings', { body: listingsPage(cards) });
    answerPhotos(api);
    answerListing(api, listing);
    const browse = new BrowsePage(page);
    const screen = new ListingPage(page);

    await browse.open();
    await browse.cardTitled('Sunlit fellowship hall for 80').link.click();

    await expect(page).toHaveURL(`/listings/${listing.id}`);
    await expect(screen.heading).toHaveText('Sunlit fellowship hall for 80');

    await screen.allListings.click();

    await expect(page).toHaveURL('/');
    await expect(browse.cards).toHaveCount(7);
  });
});
