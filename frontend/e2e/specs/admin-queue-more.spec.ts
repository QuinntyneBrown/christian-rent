import type { ApiFixtures } from '../fixtures/api';
import {
  GARDEN_ROW,
  REVIEW_NOW,
  answerAdmin,
  answerDetail,
  detailOf,
  manyRows,
  queuePage,
  LOCKER_LISTING,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

/** The queue as the API pages `total` rows: 50 a page, each cursor naming where the next starts. */
function answerPages(api: ApiFixtures, total: number) {
  const rows = manyRows(total);
  api.answer('GET', '/api/review-queue', (url) => {
    const from = Number(url.searchParams.get('cursor') ?? 0);
    const next = from + 50 < total ? String(from + 50) : null;
    return { body: queuePage(rows.slice(from, from + 50), next, total) };
  });
  answerDetail(api, rows[0]!.id, detailOf(rows[0]!, { listing: LOCKER_LISTING }));
  return rows;
}

const pageRequests = (requests: string[]) =>
  requests.filter((request) => /^GET \/api\/review-queue(\?|$)/.test(request));

test.describe('A queue of more than one page', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api, [GARDEN_ROW]);
  });

  // L2-019 criteria 4 and 10.
  test('loads the next page as the end of the list is reached', async ({ page, api }) => {
    const rows = answerPages(api, 63);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.rows).toHaveCount(50);
    await expect(admin.summary).toHaveText('63 waiting · oldest first · showing 50');
    await expect(admin.moreText).toHaveText('Showing 50 of 63');
    await expect(admin.moreButton).toHaveText('Load 13 more');
    await expect(admin.waitingCount).toHaveText('63');
    const release = api.hold('GET', '/api/review-queue');

    await admin.scrollToEnd();

    await expect(admin.moreStatus).toHaveText('Loading more of the queue…');
    await expect(admin.moreButton).toHaveAttribute('aria-busy', 'true');
    release();
    await expect(admin.rows).toHaveCount(63);
    await expect(admin.rowTitles.last()).toHaveText(rows[62]!.title);
    await expect(admin.summary).toHaveText('63 waiting · oldest first');
    await expect(admin.more).toHaveCount(0);
    expect(pageRequests(api.requests)).toEqual([
      'GET /api/review-queue',
      'GET /api/review-queue?cursor=50',
    ]);
  });

  // L2-019 criterion 20.
  test('keeps what it has when the next page fails, and loads it on "Try again"', async ({
    page,
    api,
  }) => {
    answerPages(api, 63);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.rows).toHaveCount(50);
    api.refuse('GET', '/api/review-queue', 500, 'server_error');

    await admin.scrollToEnd();

    await expect(admin.moreAlert).toHaveText('We couldn’t load more of the queue.');
    await expect(admin.rows).toHaveCount(50);
    await expect(admin.moreButton).toHaveText('Try again');
    answerPages(api, 63);
    await admin.moreButton.click();

    await expect(admin.rows).toHaveCount(63);
    await expect(admin.more).toHaveCount(0);
    expect(pageRequests(api.requests)).toHaveLength(3);
  });

  // L2-019 criterion 19; L2-030 criterion 4: 200 items waiting, never more than 150 rows kept.
  test('keeps at most 150 items, and loads released ones again on the way back', async ({
    page,
    api,
  }) => {
    const rows = answerPages(api, 200);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.rows).toHaveCount(50);
    for (const [held, last] of [
      [100, 99],
      [150, 149],
      [150, 199],
    ] as const) {
      await admin.scrollToEnd();
      await expect(admin.rows).toHaveCount(held);
      await expect(admin.rowTitles.last()).toHaveText(rows[last]!.title);
    }
    await expect(admin.rowTitles.first()).toHaveText(rows[50]!.title);
    await expect(admin.summary).toHaveText('200 waiting · oldest first · showing 150');
    // The item selected stays shown after its row has been released.
    await expect(admin.detailTitle).toHaveText(LOCKER_LISTING.title);

    await admin.scrollToStart();

    await expect(admin.rowTitles.first()).toHaveText(rows[0]!.title);
    await expect(admin.rows).toHaveCount(150);
    await expect(admin.currentRow).toContainText(rows[0]!.title);
  });
});
