import {
  GARDEN_ROW,
  LOCKER_ROW,
  QUEUE,
  REVIEW_NOW,
  answerAdmin,
  queuePage,
} from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

const ARRIVALS = '/api/admin/review-queue/arrivals';

// L2-019 criterion 12: the screen's clock is the test's, which moves it on a minute.
test('says that new items arrived, and shows them when asked', async ({ page, api }) => {
  await page.clock.install({ time: REVIEW_NOW });
  const later = { ...LOCKER_ROW, id: '4e71e700-0000-4000-8000-000000000044', title: 'A new van' };
  answerAdmin(api, [GARDEN_ROW]);
  api.answer('GET', ARRIVALS, { body: { newListings: 1, reports: 1, newMembers: 0 } });
  const admin = new AdminPage(page);
  await admin.open();
  await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);

  await page.clock.fastForward(60_000);

  await expect(admin.toastTitles).toHaveText(['2 new items are waiting']);
  await expect(admin.toastTexts).toHaveText([
    'A new listing and a report arrived while you were reviewing.',
  ]);
  await expect(admin.rows).toHaveCount(1);
  expect(api.requests).toContain(`GET ${ARRIVALS}?since=${encodeURIComponent(queuePage([]).asOf)}`);
  api.answer('GET', '/api/admin/review-queue', { body: queuePage([...QUEUE, later]) });

  await admin.showThem.click();

  await expect(admin.rows).toHaveCount(5);
  await expect(admin.toasts).toHaveCount(0);
  await expect(admin.currentRow).toContainText(GARDEN_ROW.title);
  await expect(admin.currentRow).toBeFocused();
});
