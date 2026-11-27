import { RENT_ORIGIN } from '../../fixtures/origins';
import {
  DETAILS,
  LOCKER_ROW,
  MEMBER_ROW,
  PARTY_BUS_LISTING,
  REPORT_ROW,
  REVIEW_NOW,
  answerAdmin,
} from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ListingPage } from '../../pages/listing.page';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('The detail of a review item', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  // L2-019 criteria 7 and 15: a new wanted listing has no photo; its title stands on a block.
  test('shows a new wanted listing with its title in place of a photo', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.open();

    await admin.select(LOCKER_ROW.title);

    await expect(admin.currentRow).toContainText(LOCKER_ROW.title);
    await expect(admin.detailTitle).toHaveText(LOCKER_ROW.title);
    await expect(admin.detailWanted).toHaveText(LOCKER_ROW.title);
    await expect(admin.detailPhoto).toHaveCount(0);
    await expect(admin.detailNoPhoto).toHaveCount(0);
    await expect(admin.detailPrice).toHaveText('Up to $60 / month');
    await expect(admin.detailTag).toHaveText('Wanted · space');
    expect(await admin.detailFacts()).toEqual([
      'Posted by: Marcus Lee Verified member',
      'Church: New Song Fellowship',
      'When: Wed, Jul 1, 2026',
      'Where: Murrayville, Langley',
      'Member since: Feb 2024',
      'Posted: Jun 8, 2026, 12:01 p.m.',
    ]);
  });

  // L2-019 criterion 8; L2-021 criterion 4: what the report says, and nobody who made it.
  test('shows a report with its reason and note over the listing, and not who reported', async ({
    page,
  }) => {
    const admin = new AdminPage(page);
    await admin.open();

    await admin.select(REPORT_ROW.title);

    await expect(admin.detailReport).toHaveText(
      'Reported as a scam by a member, 40 min ago: “Asking people to pay cash off the site. ' +
        'Doesn’t seem to belong to any church.”',
    );
    await expect(admin.detailTitle).toHaveText(REPORT_ROW.title);
    await expect(admin.detailNoPhoto).toBeVisible();
    await expect(admin.detailPrice).toHaveText('$40 / hour');
    expect(await admin.detailFacts()).toEqual([
      'Posted by: Mike Rentals',
      'Church: Surrey Open Door',
      'When: Any evening',
      'Where: Surrey',
      'Member since: Jun 2026',
      'Public since: Jun 6, 2026',
    ]);
    await expect(admin.viewOnSite).toHaveAttribute(
      'href',
      `${RENT_ORIGIN}/listings/${PARTY_BUS_LISTING.id}`,
    );
    await expect(admin.detailControls).toHaveText([
      'Keep listing',
      'Remove',
      'View on site (opens in a new tab)',
    ]);
  });

  // L2-019 criterion 8: "View on site" opens the listing.
  test('opens a reported listing on the site', async ({ page, api }) => {
    api.answer('GET', `/api/listings/${PARTY_BUS_LISTING.id}`, {
      body: {
        ...PARTY_BUS_LISTING,
        distanceKm: null,
        poster: { ...PARTY_BUS_LISTING.poster, memberSince: 2026 },
        isOwn: false,
        reportedAt: null,
      },
    });
    const admin = new AdminPage(page);
    await admin.open();
    await admin.select(REPORT_ROW.title);

    // It opens in a new tab, on the site's own origin (L2-041, criterion 3).
    const [site] = await Promise.all([
      page.context().waitForEvent('page'),
      admin.viewOnSite.click(),
    ]);

    await expect(site).toHaveURL(`${RENT_ORIGIN}/listings/${PARTY_BUS_LISTING.id}`);
    await expect(new ListingPage(site).heading).toHaveText(PARTY_BUS_LISTING.title);
  });

  // L2-019 criteria 9, 16 and 17.
  test('shows a new member with their church, their listings and their messages', async ({
    page,
  }) => {
    const admin = new AdminPage(page);
    await admin.open();

    await admin.select(MEMBER_ROW.title);

    await expect(admin.detailTitle).toHaveText('Dr. Alicia Gomez');
    await expect(admin.detailMember).toContainText('Joined Jun 8, 2026, 11:20 a.m.');
    expect(await admin.detailFacts()).toEqual([
      'Name: Dr. Alicia Gomez',
      'Church: St. Paul’s Anglican, Fort Langley',
      'Declared: “I am a Christian”',
      'Church status: New to christian.rent, entered by this member',
      'Listings: 1 wanted listing, public',
      'Messages sent: None',
    ]);
    // The church is not verified, so it can be confirmed here (L2-018, criterion 7).
    await expect(admin.detailControls).toHaveText(['Confirm church', 'Approve', 'Remove']);
  });

  // L2-026 criterion 1: what members write is text, never HTML.
  test('renders what members wrote as text', async ({ page, api }) => {
    const markup = '<img src="/x" onerror="alert(1)">';
    const report = DETAILS.get(REPORT_ROW.id) as {
      report: { listing: object };
    };
    api.answer('GET', `/api/admin/review-queue/${REPORT_ROW.id}`, {
      body: {
        ...report,
        report: {
          ...report.report,
          note: markup,
          listing: { ...report.report.listing, title: markup, note: markup },
        },
      },
    });
    const admin = new AdminPage(page);
    await admin.open();

    await admin.select(REPORT_ROW.title);

    await expect(admin.detailTitle).toHaveText(markup);
    await expect(admin.detailNote).toHaveText(markup);
    await expect(admin.detailReport).toContainText(markup);
    await expect(admin.detail.locator('img')).toHaveCount(0);
  });

  // A newer selection replaces the one before it, whichever answers first.
  test('shows the item selected last when an earlier one answers late', async ({ page, api }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.detailTitle).toHaveText('Backyard garden for gatherings');
    const release = api.hold('GET', `/api/admin/review-queue/${REPORT_ROW.id}`);

    await admin.select(REPORT_ROW.title);
    await admin.select(LOCKER_ROW.title);
    await expect(admin.detailTitle).toHaveText(LOCKER_ROW.title);
    release();

    await expect(admin.detailTitle).toHaveText(LOCKER_ROW.title);
    await expect(admin.detailReport).toHaveCount(0);
  });
});
