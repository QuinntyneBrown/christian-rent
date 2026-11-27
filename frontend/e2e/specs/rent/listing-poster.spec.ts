// Acceptance Test
// Traces to: L2-007, L2-008, L2-026, L2-032
// Description: Listing shows who posted it and their church, each marked Verified only when verified, and the wanted variant with no photo.
import { answerListing, hall, office, van } from '../../fixtures/listing';
import { expect, test } from '../../fixtures/test';
import { ListingPage } from '../../pages/listing.page';

test.describe('Listing, who posted it', () => {
  // L2-008 criteria 1, 2, 3 and 6; L2-032 criterion 3: both verified, each with text and an icon.
  test('marks a verified member and a verified church, separately', async ({ page, api }) => {
    const listing = hall();
    answerListing(api, listing);
    const poster = new ListingPage(page).poster;

    await new ListingPage(page).open(listing.id);

    await expect(poster.name).toHaveText('Pastor Dan Whitaker');
    await expect(poster.church).toHaveText('Grace Community Church');
    await expect(poster.since).toHaveText('Member since 2023');
    await expect(poster.avatar).toHaveText('DW');
    await expect(poster.avatar).toHaveAttribute('aria-hidden', 'true');
    await expect(poster.memberVerified).toHaveText('Verified member');
    await expect(poster.memberVerified).toBeVisible();
    await expect(poster.memberVerified.locator('svg')).toHaveCount(1);
    await expect(poster.churchVerified).toHaveText('Verified church');
  });

  // L2-007 criterion 2; L2-008 criteria 3 and 4: a wanted listing, as the wanted mock draws it,
  // with no photo; the member verified and the church not.
  test('shows a wanted listing with no photo, and only the member verified', async ({
    page,
    api,
  }) => {
    const listing = van();
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText('15-passenger van for youth camp');
    await expect(screen.wantedPanel.locator('.tag')).toHaveText('Wanted · thing');
    await expect(screen.wantedWhen).toHaveText('Jul 14 to 18, 2026');
    await expect(screen.gallery.root).toHaveCount(0);
    await expect(screen.listing.locator('img')).toHaveCount(0);
    await expect(screen.facts).toHaveText(['Murrayville, Langley', 'Posted 1 day ago']);
    await expect(screen.note).toHaveText(listing.note!);
    await expect(screen.messageBoxHeading).toHaveText('Offer to help Marcus about this listing');
    await expect(screen.eyebrow).toHaveText('They’ll pay');
    await expect(screen.price).toHaveText('Up to $120 CAD / day');
    await expect(screen.poster.memberVerified).toHaveText('Verified member');
    await expect(screen.poster.churchVerified).toHaveCount(0);
    await expect(screen.poster.avatar).toHaveText('ML');
  });

  // L2-008 criterion 4: neither verified, so no mark at all, as the unverified mock draws it.
  test('shows no mark when neither the member nor the church is verified', async ({
    page,
    api,
  }) => {
    const listing = office();
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.poster.name).toHaveText('Dr. Alicia Gomez');
    await expect(screen.poster.church).toHaveText('St. Paul’s Anglican');
    await expect(screen.poster.root.locator('.verified')).toHaveCount(0);
    await expect(screen.poster.root).not.toContainText('Verified');
    await expect(screen.facts.last()).toHaveText('Posted 6 hours ago');
  });

  // L2-007 criterion 2: a wanted listing that gave no price shows none.
  test('shows no price for a wanted listing that gave none', async ({ page, api }) => {
    const listing = van({ price: null });
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText('15-passenger van for youth camp');
    await expect(screen.price).toHaveCount(0);
    await expect(screen.eyebrow).toHaveCount(0);
    // The box is there without its head (L2-015, criterion 13; ADR 0022).
    await expect(screen.message.submit).toHaveText('Offer to help Marcus');
  });

  // L2-026 criterion 1: what a member writes is shown as text, and nothing runs.
  test('renders a title, note and names with markup as text', async ({ page, api }) => {
    const script = '<img src=x onerror="window.__ran = true"><b>bold</b>';
    const listing = hall({
      title: `Hall ${script}`,
      note: `Note ${script}`,
      poster: {
        name: `Dan ${script}`,
        isVerified: false,
        memberSince: 2023,
        church: { name: `Grace ${script}`, isVerified: false },
      },
    });
    answerListing(api, listing);
    const screen = new ListingPage(page);

    await screen.open(listing.id);

    await expect(screen.heading).toHaveText(`Hall ${script}`);
    await expect(screen.note).toHaveText(`Note ${script}`);
    await expect(screen.poster.name).toHaveText(`Dan ${script}`);
    await expect(screen.poster.church).toHaveText(`Grace ${script}`);
    await expect(page).toHaveTitle(`Hall ${script} · christian.rent`);
    await expect(screen.main.locator('b')).toHaveCount(0);
    expect(await page.evaluate(() => (window as { __ran?: boolean }).__ran)).toBeUndefined();
  });
});
