import {
  GARDEN_ROW,
  LOCKER_ROW,
  MEMBER_ROW,
  REPORT_ROW,
  REVIEW_NOW,
  answerAdmin,
  answerDecision,
  answerDetail,
  decisionOf,
  DETAILS,
  type ReviewRowFixture,
} from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ConfirmRemoveDialogPart } from '../../pages/confirm-remove-dialog.part';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('Deciding a review item', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
  });

  // L2-020 criteria 1, 8, 11, 15 and 16.
  test('approves a new listing, says so, and selects the next item @critical', async ({
    page,
    api,
  }) => {
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

test.describe('Keeping and removing', () => {
  /** A second report of the party bus, which removing the listing closes too. */
  const SECOND_REPORT: ReviewRowFixture = {
    ...REPORT_ROW,
    id: '4e71e700-0000-4000-8000-000000000033',
  };

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
  });

  async function openOn(admin: AdminPage, title: string): Promise<void> {
    await admin.open();
    await admin.select(title);
    await expect(admin.detailTitle).toHaveText(title);
  }

  // L2-020 criteria 2, 8 and 15.
  test('keeps a reported listing and says that the report is closed', async ({ page, api }) => {
    answerAdmin(api);
    answerDecision(api, REPORT_ROW.id);
    const admin = new AdminPage(page);
    await openOn(admin, REPORT_ROW.title);
    await expect(admin.decisionButtons).toHaveText(['Keep listing', 'Remove']);

    await admin.keep.click();

    await expect(admin.toastTitles).toHaveText(['Kept']);
    await expect(admin.toastTexts).toHaveText([
      '“Party bus, cheap, DM for details” stays public on Browse. The report is closed.',
    ]);
    await expect(admin.currentRow).toContainText(LOCKER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    expect(api.bodies.get(`POST ${decisionOf(REPORT_ROW.id)}`)).toEqual([
      { decision: 'keep', version: 0 },
    ]);
  });

  // L2-020 criteria 4 and 9: nothing is sent until the removal is confirmed.
  test('asks before removing, with focus on "Keep it", which changes nothing', async ({
    page,
    api,
  }) => {
    answerAdmin(api);
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await openOn(admin, REPORT_ROW.title);

    await admin.remove.click();

    await expect(dialog.title).toHaveText('Remove “Party bus, cheap, DM for details”?');
    await expect(dialog.description).toHaveText(
      'The listing stops being public, every open report on it is closed, and Mike Rentals is ' +
        'told it was removed. Your name and the time are recorded.',
    );
    await expect(dialog.root).toHaveAccessibleName('Remove “Party bus, cheap, DM for details”?');
    await expect(dialog.dangerIcon).toBeVisible();
    await expect(dialog.confirm).toHaveText('Remove listing');
    await expect(dialog.keepIt).toBeFocused();

    await dialog.keepIt.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.remove).toBeFocused();
    await admin.remove.click();
    await page.keyboard.press('Escape');
    await expect(dialog.root).toHaveCount(0);
    await expect(admin.rows).toHaveCount(4);
    expect(api.requests.filter((request) => request.startsWith('POST'))).toEqual([]);
  });

  // L2-020 criteria 7, 10, 11 and 15: busy while in flight; every item it closed leaves.
  test('removes a reported listing with every report on it', async ({ page, api }) => {
    answerAdmin(api, [GARDEN_ROW, REPORT_ROW, SECOND_REPORT, LOCKER_ROW]);
    answerDetail(api, SECOND_REPORT.id, DETAILS.get(REPORT_ROW.id)!);
    answerDecision(api, REPORT_ROW.id, [SECOND_REPORT.id]);
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await admin.open();
    await admin.rows.nth(1).click();
    await expect(admin.detailTitle).toHaveText(REPORT_ROW.title);
    await admin.remove.click();
    const release = api.hold('POST', decisionOf(REPORT_ROW.id));

    await dialog.confirm.click();

    await expect(dialog.confirm).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.keepIt).toHaveAttribute('aria-disabled', 'true');
    await expect(dialog.close).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await dialog.keepIt.click({ force: true });
    await dialog.close.click({ force: true });
    await dialog.confirm.click();
    await expect(dialog.title).toBeVisible();
    release();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.toastTitles).toHaveText(['Removed']);
    await expect(admin.toastTexts).toHaveText([
      '“Party bus, cheap, DM for details” is no longer public.',
    ]);
    await expect(admin.rowTitles).toHaveText([GARDEN_ROW.title, LOCKER_ROW.title]);
    await expect(admin.summary).toHaveText('2 waiting · oldest first');
    await expect(admin.currentRow).toContainText(LOCKER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    expect(api.bodies.get(`POST ${decisionOf(REPORT_ROW.id)}`)).toEqual([
      { decision: 'remove', version: 0 },
    ]);
  });

  // L2-020 criteria 10 and 12: a removal that fails is said in its confirmation.
  test('says in the confirmation that nothing changed, and tries again', async ({ page, api }) => {
    answerAdmin(api);
    api.refuse('POST', decisionOf(GARDEN_ROW.id), 500, 'server_error');
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await openOn(admin, GARDEN_ROW.title);
    await admin.remove.click();

    await dialog.confirm.click();

    await expect(dialog.alertTitle).toHaveText('The listing wasn’t removed.');
    await expect(dialog.alertText).toHaveText(
      'We couldn’t reach christian.rent. Nothing has changed.',
    );
    await expect(dialog.confirm).toHaveText('Try again');
    await expect(dialog.keepIt).not.toHaveAttribute('aria-disabled', 'true');
    expect(await dialog.holdsFocus()).toBe(true);
    await expect(admin.rows).toHaveCount(4);
    await expect(admin.toasts).toHaveCount(0);

    answerDecision(api, GARDEN_ROW.id);
    await dialog.confirm.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.toastTexts).toHaveText([
      '“Backyard garden for gatherings” won’t appear on Browse.',
    ]);
    await expect(admin.rows).toHaveCount(3);
  });

  // L2-020 criterion 9: a new listing and a new member each say what follows.
  test('says what removing a new listing or a new member does', async ({ page, api }) => {
    answerAdmin(api);
    answerDecision(api, MEMBER_ROW.id);
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await openOn(admin, GARDEN_ROW.title);

    await admin.remove.click();

    await expect(dialog.description).toHaveText(
      'The listing never becomes public, and The Okafor family is told it was removed. ' +
        'Your name and the time are recorded.',
    );
    await dialog.close.click();
    await admin.select(MEMBER_ROW.title);
    await expect(admin.detailTitle).toHaveText(MEMBER_ROW.title);
    await admin.remove.click();

    await expect(dialog.title).toHaveText('Remove Dr. Alicia Gomez?');
    await expect(dialog.description).toHaveText(
      'Dr. Alicia Gomez can no longer sign in, post or message, and their listings stop being ' +
        'public. Your name and the time are recorded.',
    );
    await expect(dialog.confirm).toHaveText('Remove member');
    await dialog.confirm.click();

    await expect(admin.toastTexts).toHaveText(['Dr. Alicia Gomez is no longer a member.']);
  });
});
