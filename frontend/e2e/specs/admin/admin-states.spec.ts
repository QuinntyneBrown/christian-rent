import { RENT_ORIGIN } from '../../fixtures/origins';
import {
  DETAILS,
  GARDEN_ROW,
  QUEUE,
  REVIEW_NOW,
  answerAdmin,
  queuePage,
} from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('The states of the review queue', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  // L2-033 criteria 1 and 5.
  test('shows a loading state in the shape of the queue while it waits', async ({ page, api }) => {
    const release = api.hold('GET', '/api/review-queue');
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.summary).toHaveText('Loading the queue…');
    await expect(admin.summary).toHaveAttribute('role', 'status');
    await expect(admin.skeletonRows.first()).toBeVisible();
    await expect(admin.detailSkeleton).toBeVisible();
    await expect(admin.waitingCount).toHaveCount(0);
    release();
    await expect(admin.rows).toHaveCount(4);
    await expect(admin.skeletonRows).toHaveCount(0);
  });

  // L2-019 criterion 3.
  test('says "All caught up" when nothing waits', async ({ page, api }) => {
    api.answer('GET', '/api/review-queue', { body: queuePage([]) });
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.summary).toHaveText('Nothing is waiting');
    await expect(admin.queueMessageTitle).toHaveText('All caught up');
    await expect(admin.queueMessageText).toHaveText(
      'New listings, reports and new members will show up here.',
    );
    await expect(admin.rows).toHaveCount(0);
    await expect(admin.phoneNote).toHaveCount(0);
    await expect(admin.waitingCount).toHaveCount(0);
    await expect(admin.detail).toBeEmpty();
    expect(api.requests.filter((request) => request.includes('/api/review-queue/'))).toEqual([]);
  });

  // L2-033 criterion 2.
  test('says that the queue did not load, and loads it on "Try again"', async ({ page, api }) => {
    api.refuse('GET', '/api/review-queue', 500, 'server_error');
    const admin = new AdminPage(page);
    await admin.open();

    await expect(admin.summary).toHaveText('The queue didn’t load');
    await expect(admin.queueMessageTitle).toHaveText('We couldn’t load the queue.');
    await expect(admin.queueMessageText).toHaveText('Check your connection and try again.');
    await expect(admin.waitingCount).toHaveCount(0);
    api.answer('GET', '/api/review-queue', { body: queuePage(QUEUE) });

    await admin.queueTryAgain.click();

    await expect(admin.rows).toHaveCount(4);
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
  });

  // L2-019 criterion 21: the panel says so; the queue stays.
  test('says that an item did not load, and loads it on "Try again"', async ({ page, api }) => {
    api.refuse('GET', `/api/review-queue/${GARDEN_ROW.id}`, 500, 'server_error');
    const admin = new AdminPage(page);
    await admin.open();

    await expect(admin.detailAlert).toContainText('We couldn’t load this item.');
    await expect(admin.detailAlert).toContainText('Check your connection and try again.');
    await expect(admin.rows).toHaveCount(4);
    api.answer('GET', `/api/review-queue/${GARDEN_ROW.id}`, { body: DETAILS.get(GARDEN_ROW.id) });

    await admin.detailTryAgain.click();

    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await expect(admin.detailAlert).toHaveCount(0);
  });

  // L2-019 criteria 18 and 21: gone since the queue was read.
  test('says that an item no longer waits, and offers to reload the queue', async ({
    page,
    api,
  }) => {
    api.refuse('GET', `/api/review-queue/${GARDEN_ROW.id}`, 404, 'not_found');
    const admin = new AdminPage(page);
    await admin.open();

    await expect(admin.detailAlert).toContainText('This item is no longer waiting.');
    await expect(admin.detailAlert).toContainText(
      'What it was about is no longer there to review.',
    );
    api.answer('GET', '/api/review-queue', { body: queuePage(QUEUE.slice(1)) });

    await admin.reloadQueue.click();

    await expect(admin.rows).toHaveCount(3);
    await expect(admin.detailTitle).toHaveText('Dr. Alicia Gomez');
  });

  // L2-036 criterion 4; ADR 0028: "Back to site" crosses to the site's own origin, even while
  // Admin is still loading; the page that held the request is gone with it.
  test('can be left for the site while it is still loading', async ({ page, api }) => {
    const release = api.hold('GET', `/api/review-queue/${GARDEN_ROW.id}`);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.rows).toHaveCount(4);
    api.answer('GET', '/api/listings', {
      body: { items: [], nextCursor: null, counts: { everything: 0, forRent: 0, wanted: 0 } },
    });

    await admin.backToSite.click();

    await expect(page).toHaveURL(`${RENT_ORIGIN}/`);
    release();
  });
});
