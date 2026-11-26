import {
  QUEUE,
  REVIEW_NOW,
  answerAdmin,
  answerDetails,
  answerQueue,
  manyItems,
  queueRequests,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.describe('The review queue', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
    answerDetails(api);
  });

  // L2-019 criteria 1 and 6: new listings, reports and new members, oldest first, each with its
  // title or name, who posted it or which church, how long it has waited and its kind in words.
  test('lists what waits, oldest first, each with its kind @critical', async ({ page, api }) => {
    answerQueue(api);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.summary).toHaveText('4 waiting · oldest first');
    await expect(admin.items.locator('.queue-item__title')).toHaveText(
      QUEUE.map((item) => item.title),
    );
    await expect(admin.items.locator('.queue-item__meta')).toHaveText([
      'The Okafor family · 3 hr',
      'St. Paul’s Anglican · 1 hr',
      'Mike Rentals · 40 min',
      'Marcus Lee · 12 min',
    ]);
    await expect(admin.items.locator('.tag')).toHaveText(['New', 'New member', 'Reported', 'New']);
    await expect(admin.itemThumb('Backyard garden for gatherings')).toHaveAttribute(
      'src',
      QUEUE[0]!.thumbUrl!,
    );
    await expect(admin.itemThumb('Dr. Alicia Gomez')).toHaveText('AG');
    await expect(admin.itemThumb('Storage locker for our food bank')).toHaveText('Want');
    await expect(admin.navLabel).toHaveText('Admin · Naomi Friesen');
    await expect(admin.reviewCount).toHaveText('4');
    await expect(admin.reviewCount).toHaveAccessibleName('4 waiting');
  });

  // L2-019 criterion 3.
  test('says "All caught up" when nothing waits', async ({ page, api }) => {
    answerQueue(api, []);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.summary).toHaveText('Nothing is waiting');
    await expect(admin.emptyTitle).toHaveText('All caught up');
    await expect(admin.emptyText).toHaveText(
      'New listings, reports and new members will show up here.',
    );
    await expect(admin.items).toHaveCount(0);
  });

  // L2-033 criterion 2: a plain message and "Try again", which loads the queue.
  test('says when the queue did not load, and tries again', async ({ page, api }) => {
    api.refuse('GET', '/api/review-queue', 500, 'unexpected');
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.summary).toHaveText('The queue didn’t load');
    await expect(admin.emptyTitle).toHaveText('We couldn’t load the queue.');
    await expect(admin.emptyText).toHaveText('Check your connection and try again.');

    answerQueue(api);
    await admin.tryAgain.click();

    await expect(admin.items).toHaveCount(4);
    await expect(admin.summary).toHaveText('4 waiting · oldest first');
  });

  // L2-033 criteria 1 and 5: rows in the shape of the queue while it waits past 300 ms.
  test('shows rows in the shape of the queue while it loads', async ({ page, api }) => {
    answerQueue(api);
    const release = api.hold('GET', '/api/review-queue');
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.summary).toHaveText('Loading the queue…');
    await expect(admin.skeletonRows.first()).toBeVisible();
    release();
    await expect(admin.items).toHaveCount(4);
    await expect(admin.skeletonRows).toHaveCount(0);
  });

  // L2-019 criteria 4 and 10: more than 50 load in pages; the heading says how many are shown.
  test('loads more than 50 in pages and says how many are shown', async ({ page, api }) => {
    answerQueue(api, manyItems(63));
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.items).toHaveCount(50);
    await expect(admin.summary).toHaveText('63 waiting · oldest first · showing 50');

    await admin.scrollQueueToEnd();

    await expect(admin.items).toHaveCount(63);
    await expect(admin.summary).toHaveText('63 waiting · oldest first');
    expect(queueRequests(api)).toEqual([
      'GET /api/review-queue',
      'GET /api/review-queue?cursor=50',
    ]);
  });

  // L2-030 criterion 4; ADR 0024: however long the queue, at most 3 pages are held.
  test('holds at most three pages however far it is scrolled', async ({ page, api }) => {
    answerQueue(api, manyItems(200));
    const admin = new AdminPage(page);
    await admin.open();

    for (const shown of [100, 150, 150]) {
      await admin.scrollQueueToEnd();
      await expect(admin.items.first()).toBeVisible();
      await expect(admin.items).toHaveCount(shown);
    }

    await expect(admin.items.last().locator('.queue-item__title')).toHaveText('Member 199');
    await expect(admin.items.first().locator('.queue-item__title')).toHaveText('Member 050');
    await expect(admin.summary).toHaveText('200 waiting · oldest first · showing 150');
  });

  // L2-031 criteria 5 and 7: on a phone only the queue, with a note to use a wider screen.
  test('shows only the queue and a note on a phone', async ({ page, api }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    answerQueue(api);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.items).toHaveCount(4);
    await expect(admin.phoneNote).toHaveText(
      'Open Admin on a tablet or a computer to see an item’s detail and decide on it.',
    );
    await expect(admin.detail).toBeHidden();
  });
});
