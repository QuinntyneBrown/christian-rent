import {
  GARDEN_ROW,
  MEMBER_ROW,
  REVIEW_NOW,
  answerAdmin,
  answerDecision,
  decisionOf,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

// L2-020 criteria 12 and 14: the screen's clock is the test's, which moves it on.
test.describe('The notifications of Admin', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.install({ time: REVIEW_NOW });
    answerAdmin(api);
  });

  async function open(admin: AdminPage): Promise<void> {
    await admin.open();
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
  }

  test('lets a success go after 8 s, and waits while the pointer is on it', async ({
    page,
    api,
  }) => {
    answerDecision(api, GARDEN_ROW.id);
    const admin = new AdminPage(page);
    await open(admin);
    await admin.approve.click();
    await expect(admin.toastTitles).toHaveText(['Approved']);

    await admin.toasts.hover();
    await page.clock.fastForward(20_000);
    await expect(admin.toasts).toHaveCount(1);
    await admin.heading.hover();
    await page.clock.fastForward(8_000);

    await expect(admin.toasts).toHaveCount(0);
  });

  test('stacks the newest at the bottom, keeps a failure, and dismisses each on its own', async ({
    page,
    api,
  }) => {
    api.refuse('POST', decisionOf(GARDEN_ROW.id), 500, 'server_error');
    answerDecision(api, MEMBER_ROW.id);
    const admin = new AdminPage(page);
    await open(admin);
    await admin.approve.click();
    await expect(admin.toastTitles).toHaveText(['Your decision wasn’t saved']);

    await admin.select(MEMBER_ROW.title);
    await expect(admin.detailTitle).toHaveText(MEMBER_ROW.title);
    await admin.approve.click();

    await expect(admin.toastTitles).toHaveText(['Your decision wasn’t saved', 'Approved']);
    await page.clock.fastForward(8_000);
    await expect(admin.toastTitles).toHaveText(['Your decision wasn’t saved']);
    await admin.dismissToast.click();
    await expect(admin.toasts).toHaveCount(0);
  });
});
