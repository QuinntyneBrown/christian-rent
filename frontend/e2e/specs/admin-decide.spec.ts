import {
  GARDEN_ROW,
  LOCKER_ROW,
  MEMBER_ROW,
  REPORT_ROW,
  REVIEW_NOW,
  answerAdmin,
  answerDecision,
  decisionOf,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('Deciding a review item', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
  });

  // L2-020 criteria 1, 8, 11, 15 and 16.
  test('approves a new listing, says so, and selects the next item', async ({ page, api }) => {
    answerAdmin(api);
    answerDecision(api, GARDEN_ROW.id);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await expect(admin.decisionButtons).toHaveText(['Approve', 'Remove']);
    const release = api.hold('POST', decisionOf(GARDEN_ROW.id));

    await admin.approve.click();

    await expect(admin.approve).toHaveAttribute('aria-busy', 'true');
    await expect(admin.remove).toBeDisabled();
    // The press a busy button swallows sends nothing more.
    await admin.approve.click();
    release();

    await expect(admin.toastTitles).toHaveText(['Approved']);
    await expect(admin.toastTexts).toHaveText([
      '“Backyard garden for gatherings” is now public on Browse.',
    ]);
    await expect(admin.rowTitles).toHaveText([
      MEMBER_ROW.title,
      REPORT_ROW.title,
      LOCKER_ROW.title,
    ]);
    await expect(admin.summary).toHaveText('3 waiting · oldest first');
    await expect(admin.waitingCount).toHaveText('3');
    await expect(admin.currentRow).toContainText(MEMBER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    await expect(admin.detailTitle).toHaveText(MEMBER_ROW.title);
    expect(api.bodies.get(`POST ${decisionOf(GARDEN_ROW.id)}`)).toEqual([
      { decision: 'approve', version: 0 },
    ]);
  });

  // L2-018 criterion 1; L2-020 criteria 3 and 15.
  test('approves a new member', async ({ page, api }) => {
    answerAdmin(api);
    answerDecision(api, MEMBER_ROW.id);
    const admin = new AdminPage(page);
    await admin.open();
    await admin.select(MEMBER_ROW.title);
    await expect(admin.detailTitle).toHaveText(MEMBER_ROW.title);

    await admin.approve.click();

    await expect(admin.toastTexts).toHaveText(['Dr. Alicia Gomez is now a verified member.']);
    await expect(admin.currentRow).toContainText(REPORT_ROW.title);
  });

  // L2-019 criterion 3; L2-020 criterion 15: with no row left, focus goes to the heading.
  test('shows All caught up once the last item is decided', async ({ page, api }) => {
    answerAdmin(api, [GARDEN_ROW]);
    answerDecision(api, GARDEN_ROW.id);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);

    await admin.approve.click();

    await expect(admin.queueMessageTitle).toHaveText('All caught up');
    await expect(admin.heading).toBeFocused();
    await expect(admin.waitingCount).toHaveCount(0);
    await expect(admin.detail.getByRole('heading')).toHaveCount(0);
  });
});
