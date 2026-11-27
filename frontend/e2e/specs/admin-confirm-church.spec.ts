// Acceptance Test
// Traces to: L2-018, L2-019, L2-020
// Description: Admin confirms a new member's church from their detail: one press, no decision, with a notification of what came of it.
import { answerNoListings } from '../fixtures/listings';
import {
  ALICIA_CHURCH,
  GARDEN_ROW,
  LOCKER_ROW,
  MEMBER_ROW,
  QUEUE,
  REVIEW_NOW,
  answerAdmin,
  answerChurchConfirmation,
  answerDetail,
  churchVerification,
  decisionOf,
  memberDetail,
  refuseDecided,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.use({ timezoneId: 'America/Vancouver' });

const CONFIRMED_TEXT =
  'St. Paul’s Anglican is now verified. Its members’ listings show it as verified.';

test.describe('Confirming a church', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  async function openOn(admin: AdminPage, title: string): Promise<void> {
    await admin.open();
    await admin.select(title);
    await expect(admin.detailTitle).toHaveText(title);
  }

  // L2-018 criteria 2, 7, 8 and 9: one press confirms the church and decides nothing.
  test('confirms a new member’s church and says so @critical', async ({ page, api }) => {
    answerChurchConfirmation(api);
    const admin = new AdminPage(page);
    await openOn(admin, MEMBER_ROW.title);
    await expect(admin.churchStatus).toHaveText('New to christian.rent, entered by this member');
    const release = api.hold('POST', churchVerification(ALICIA_CHURCH));

    await admin.confirmChurch.click();

    await expect(admin.confirmChurch).toHaveAttribute('aria-busy', 'true');
    await expect(admin.approve).toBeDisabled();
    await expect(admin.remove).toBeDisabled();
    // The press a busy button swallows sends nothing more.
    await admin.confirmChurch.dispatchEvent('click');
    release();

    await expect(admin.toastTitles).toHaveText(['Church confirmed']);
    await expect(admin.toastTexts).toHaveText([CONFIRMED_TEXT]);
    await expect(admin.churchStatus).toHaveText('Verified');
    await expect(admin.churchStatus).toBeFocused();
    await expect(admin.confirmChurch).toHaveCount(0);
    await expect(admin.approve).toBeEnabled();
    await expect(admin.remove).toBeEnabled();
    await expect(admin.rows).toHaveCount(QUEUE.length);
    await expect(admin.currentRow).toContainText(MEMBER_ROW.title);
    expect(api.requests.filter((request) => request.startsWith('POST'))).toEqual([
      `POST ${churchVerification(ALICIA_CHURCH)}`,
    ]);
  });

  // L2-018 criterion 7: a verified church, and a listing's church, have no control.
  test('offers no control for a verified church or on a listing', async ({ page, api }) => {
    answerDetail(api, MEMBER_ROW.id, memberDetail({ isVerified: true }));
    const admin = new AdminPage(page);
    await openOn(admin, LOCKER_ROW.title);
    await expect(admin.confirmChurch).toHaveCount(0);

    await admin.select(MEMBER_ROW.title);

    await expect(admin.churchStatus).toHaveText('Verified');
    await expect(admin.confirmChurch).toHaveCount(0);
  });

  // L2-018 criterion 8: off while a decision is in flight and once another admin decided.
  test('is off while a decision is in flight and after another came first', async ({
    page,
    api,
  }) => {
    refuseDecided(api, MEMBER_ROW.id, { decision: 'approve', decidedByYou: false });
    const admin = new AdminPage(page);
    await openOn(admin, MEMBER_ROW.title);
    const release = api.hold('POST', decisionOf(MEMBER_ROW.id));

    await admin.approve.click();

    await expect(admin.confirmChurch).toBeDisabled();
    release();
    await expect(admin.conflictTitle).toHaveText('This was already decided.');
    await expect(admin.confirmChurch).toBeDisabled();
  });

  // L2-018 criterion 10: nothing changes, and "Try again" confirms the same church, even after
  // the admin has moved on, whose panel and focus stay.
  test('says a church was not confirmed, and tries the same church again', async ({
    page,
    api,
  }) => {
    api.refuse('POST', churchVerification(ALICIA_CHURCH), 500, 'server_error');
    const admin = new AdminPage(page);
    await openOn(admin, MEMBER_ROW.title);

    await admin.confirmChurch.click();

    await expect(admin.toastTitles).toHaveText(['The church wasn’t confirmed']);
    await expect(admin.toastTexts).toHaveText([
      'We couldn’t reach christian.rent. St. Paul’s Anglican is not verified yet.',
    ]);
    await expect(admin.churchStatus).toHaveText('New to christian.rent, entered by this member');
    await expect(admin.confirmChurch).toBeEnabled();
    await expect(admin.approve).toBeEnabled();

    await admin.select(GARDEN_ROW.title);
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    answerChurchConfirmation(api);
    await admin.tryDecisionAgain.click();

    await expect(admin.toastTitles).toHaveText(['Church confirmed']);
    await expect(admin.toastTexts).toHaveText([CONFIRMED_TEXT]);
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await expect(admin.currentRow).toContainText(GARDEN_ROW.title);
    expect(
      api.requests.filter((request) => request === `POST ${churchVerification(ALICIA_CHURCH)}`),
    ).toHaveLength(2);
  });

  // L2-018 criteria 9 and 10: tried again on the same panel, the status takes focus and the
  // failure's notification goes.
  test('verifies the church on the panel once trying again succeeds', async ({ page, api }) => {
    api.refuse('POST', churchVerification(ALICIA_CHURCH), 500, 'server_error');
    const admin = new AdminPage(page);
    await openOn(admin, MEMBER_ROW.title);
    await admin.confirmChurch.click();
    await expect(admin.toastTitles).toHaveText(['The church wasn’t confirmed']);
    answerChurchConfirmation(api);

    await admin.tryDecisionAgain.click();

    await expect(admin.churchStatus).toHaveText('Verified');
    await expect(admin.churchStatus).toBeFocused();
    await expect(admin.toastTitles).toHaveText(['Church confirmed']);
  });

  // L2-033: leaving Admin aborts the confirmation on its way.
  test('aborts a confirmation on its way when the admin leaves', async ({ page, api }) => {
    answerChurchConfirmation(api);
    answerNoListings(api);
    const admin = new AdminPage(page);
    await openOn(admin, MEMBER_ROW.title);
    api.hold('POST', churchVerification(ALICIA_CHURCH));
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith(churchVerification(ALICIA_CHURCH)),
    );
    await admin.confirmChurch.click();
    await expect(admin.confirmChurch).toHaveAttribute('aria-busy', 'true');

    await admin.backToSite.click();

    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
    await expect(page).toHaveURL('/');
  });
});
