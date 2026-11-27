import { RENT_ORIGIN } from '../../fixtures/origins';
import { DETAILS, GARDEN_ROW, QUEUE, REVIEW_NOW, answerAdmin } from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

const detailRequests = (requests: string[]) =>
  requests.filter((request) => request.startsWith('GET /api/review-queue/'));

test.describe('The review queue', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  // L2-019 criteria 1, 2, 6, 7, 13 and 14.
  test('lists what waits, oldest first, with the first item selected and shown @critical', async ({
    page,
    api,
  }) => {
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.heading).toBeVisible();
    await expect(admin.summary).toHaveText('4 waiting · oldest first');
    await expect(admin.rowTitles).toHaveText(QUEUE.map((row) => row.title));
    await expect(admin.rowDetails).toHaveText([
      'The Okafor family · 3 hr',
      'St. Paul’s Anglican · 1 hr',
      'Mike Rentals · 40 min',
      'Marcus Lee · 12 min',
    ]);
    await expect(admin.rowTags).toHaveText(['New', 'New member', 'Reported', 'New']);
    await expect(admin.rowThumbs.nth(0)).toHaveAttribute('src', '/api/photos/garden/thumb');
    await expect(admin.rowThumbs.nth(1)).toHaveText('AG');
    await expect(admin.rowThumbs.nth(3)).toHaveText('Want');

    await expect(admin.rowButtons).toHaveCount(4);
    await expect(admin.currentRow).toContainText(GARDEN_ROW.title);
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await expect(admin.detailPrice).toHaveText('$150 / day');
    await expect(admin.detailTag).toHaveText('For rent · space');
    await expect(admin.detailNote).toHaveText('Seats 30 at a long table under string lights.');
    expect(await admin.detailFacts()).toEqual([
      'Posted by: The Okafor family Verified member',
      'Church: Redeemer Presbyterian Verified church',
      'When: Fridays and Saturdays',
      'Where: Brookswood, Langley',
      'Member since: Apr 2025',
      'Posted: Jun 8, 2026, 9:12 a.m.',
    ]);
    expect(detailRequests(api.requests)).toEqual([`GET /api/review-queue/${GARDEN_ROW.id}`]);

    await expect(admin.navLabel).toHaveText('Admin · Naomi Friesen');
    await expect(admin.reviewLink).toHaveAttribute('aria-current', 'page');
    await expect(admin.waitingCount).toHaveText('4');
    await expect(admin.backToSite).toHaveAttribute('href', `${RENT_ORIGIN}/`);
    // A new listing is only approved or removed: nothing else is offered.
    await expect(admin.detailControls).toHaveText(['Approve', 'Remove']);
    await expect(admin.phoneNote).toBeHidden();
  });

  // L2-019 criterion 15: every photo, the first large, in the member's order.
  test('shows all of a listing’s photos in the order the member gave them', async ({ page }) => {
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.detailPhoto).toHaveAttribute('src', '/api/photos/garden/gallery');
    await expect(admin.detailPhoto).toHaveAttribute(
      'alt',
      'A long table set for dinner on a lawn under string lights',
    );
    await expect(admin.detailMorePhotos).toHaveCount(2);
    await expect(admin.detailMorePhotos.nth(0)).toHaveAttribute(
      'alt',
      'Backyard garden for gatherings, photo 2 of 3',
    );
    await expect(admin.detailMorePhotos.nth(1)).toHaveAttribute(
      'alt',
      'A guest room with a made bed',
    );
  });

  // L2-019 criterion 15: a listing for rent with none says so.
  test('says that a listing for rent has no photo', async ({ page, api }) => {
    const garden = DETAILS.get(GARDEN_ROW.id) as { listing: object };
    api.answer('GET', `/api/review-queue/${GARDEN_ROW.id}`, {
      body: { ...garden, listing: { ...garden.listing, photos: [] } },
    });
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.detailNoPhoto).toBeVisible();
    await expect(admin.detailPhoto).toHaveCount(0);
  });

  // L2-019 criterion 13; L2-031 criteria 5 and 7.
  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('shows only the queue, asks for no detail and says why', async ({ page, api }) => {
      const admin = new AdminPage(page);

      await admin.open();

      await expect(admin.rows).toHaveCount(4);
      await expect(admin.phoneNote).toHaveText(
        'Open Admin on a tablet or a computer to see an item’s detail and decide on it.',
      );
      await expect(admin.rowButtons).toHaveCount(0);
      await expect(admin.currentRow).toHaveCount(0);
      await expect(admin.detail).toBeHidden();
      await expect(admin.backToSite).toBeVisible();
      expect(detailRequests(api.requests)).toEqual([]);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(390);
    });

    test('selects the first item once the screen is wide enough', async ({ page }) => {
      const admin = new AdminPage(page);
      await admin.open();
      await expect(admin.rows).toHaveCount(4);

      await page.setViewportSize({ width: 768, height: 844 });

      await expect(admin.rowButtons).toHaveCount(4);
      await expect(admin.currentRow).toContainText(GARDEN_ROW.title);
      await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);

      await page.setViewportSize({ width: 390, height: 844 });

      await expect(admin.rowButtons).toHaveCount(0);
      await expect(admin.currentRow).toHaveCount(0);
    });
  });
});
