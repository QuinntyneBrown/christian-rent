import {
  GARDEN_ROW,
  LOCKER_ROW,
  MEMBER_ROW,
  REVIEW_NOW,
  answerAdmin,
  answerDecision,
  decisionOf,
  refuseDecided,
} from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ConfirmRemoveDialogPart } from '../../pages/confirm-remove-dialog.part';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('A decision that is not made', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  async function open(admin: AdminPage): Promise<void> {
    await admin.open();
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
  }

  // L2-020 criteria 5 and 13.
  test('says what another admin decided first, and goes to the next item', async ({
    page,
    api,
  }) => {
    refuseDecided(api, GARDEN_ROW.id, { decision: 'approve', decidedByYou: false });
    const admin = new AdminPage(page);
    await open(admin);

    await admin.approve.click();

    await expect(admin.conflictTitle).toHaveText('This was already decided.');
    await expect(admin.conflictText).toHaveText(
      'Another admin approved it at 12:14 p.m. Your decision was not applied.',
    );
    await expect(admin.approve).toBeDisabled();
    await expect(admin.remove).toBeDisabled();
    await expect(admin.toastTitles).toHaveText(['Already decided']);
    await expect(admin.toastTexts).toHaveText([
      'Another admin approved “Backyard garden for gatherings” first. ' +
        'Your decision was not applied.',
    ]);
    await expect(admin.rows).toHaveCount(4);

    await admin.nextItem.click();

    await expect(admin.rows).toHaveCount(3);
    await expect(admin.summary).toHaveText('3 waiting · oldest first');
    await expect(admin.currentRow).toContainText(MEMBER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    await expect(admin.conflictTitle).toHaveCount(0);
    await expect(admin.approve).toBeEnabled();
  });

  // L2-020 criteria 10 and 13: the confirmation gives way to what the panel says.
  test('closes the confirmation of a removal another admin overtook', async ({ page, api }) => {
    refuseDecided(api, GARDEN_ROW.id, { decision: 'remove', decidedByYou: true });
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await open(admin);
    await admin.remove.click();

    await dialog.confirm.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.conflictText).toHaveText(
      'You removed it at 12:14 p.m. Your decision was not applied.',
    );
  });

  // L2-020 criterion 18.
  test('says that an item which no longer waits is gone', async ({ page, api }) => {
    api.refuse('POST', decisionOf(GARDEN_ROW.id), 404, 'not_found');
    const admin = new AdminPage(page);
    await open(admin);

    await admin.approve.click();

    await expect(admin.detailAlert).toContainText('This item is no longer waiting.');
    await expect(admin.reloadQueue).toBeVisible();
    await expect(admin.decisionButtons).toHaveCount(0);
    await expect(admin.toasts).toHaveCount(0);
  });

  // L2-020 criterion 12.
  test('keeps an item whose approval failed, and tries the same decision again', async ({
    page,
    api,
  }) => {
    api.refuse('POST', decisionOf(GARDEN_ROW.id), 500, 'server_error');
    const admin = new AdminPage(page);
    await open(admin);

    await admin.approve.click();

    await expect(admin.toastTitles).toHaveText(['Your decision wasn’t saved']);
    await expect(admin.toastTexts).toHaveText([
      'We couldn’t reach christian.rent. “Backyard garden for gatherings” is still in the queue.',
    ]);
    await expect(admin.rows).toHaveCount(4);
    await expect(admin.currentRow).toContainText(GARDEN_ROW.title);
    await expect(admin.approve).toBeEnabled();

    // "Try again" repeats the decision on its item, whichever item is selected by then.
    await admin.select(LOCKER_ROW.title);
    await expect(admin.detailTitle).toHaveText(LOCKER_ROW.title);
    answerDecision(api, GARDEN_ROW.id);
    await admin.tryDecisionAgain.click();

    await expect(admin.toastTitles).toHaveText(['Approved']);
    await expect(admin.rows).toHaveCount(3);
    await expect(admin.currentRow).toContainText(LOCKER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    expect(api.bodies.get(`POST ${decisionOf(GARDEN_ROW.id)}`)).toEqual([
      { decision: 'approve', version: 0 },
      { decision: 'approve', version: 0 },
    ]);
  });
});
