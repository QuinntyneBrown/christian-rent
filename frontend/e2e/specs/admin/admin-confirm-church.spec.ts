import {
  DETAILS,
  MEMBER_ROW,
  NAOMI,
  REVIEW_NOW,
  ST_PAULS,
  answerAdmin,
  answerChurchConfirmed,
  answerDecision,
  answerDetail,
  decisionOf,
  verificationOf,
} from '../../fixtures/review';
import { ADMIN_SESSION, answerSigningIn } from '../../fixtures/session';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { SignInPage } from '../../pages/sign-in.page';

test.use({ timezoneId: 'America/Vancouver' });

const UNCONFIRMED = 'New to christian.rent, entered by this member';
const CONFIRM = `POST ${verificationOf(ST_PAULS.id)}`;
const sent = (requests: string[]) => requests.filter((request) => request === CONFIRM);

test.describe('Confirming a church', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
  });

  async function openOnMember(admin: AdminPage): Promise<void> {
    await admin.open();
    await admin.select(MEMBER_ROW.title);
    await expect(admin.detailTitle).toHaveText(MEMBER_ROW.title);
  }

  // L2-018 criteria 2, 7 and 8; L2-019 criteria 9 and 16.
  test('confirms a new member’s church, says so, and leaves the member waiting @critical', async ({
    page,
    api,
  }) => {
    answerChurchConfirmed(api);
    const admin = new AdminPage(page);
    await openOnMember(admin);
    await expect.poll(() => admin.fact('Church status')).toBe(UNCONFIRMED);
    await expect(admin.detailControls).toHaveText(['Confirm church', 'Approve', 'Remove']);
    const release = api.hold('POST', verificationOf(ST_PAULS.id));

    await admin.confirmChurch.click();

    await expect(admin.confirmChurch).toHaveAttribute('aria-busy', 'true');
    await expect(admin.approve).toBeDisabled();
    await expect(admin.remove).toBeDisabled();
    // The press a busy button swallows sends nothing more.
    await admin.confirmChurch.dispatchEvent('click');
    release();

    await expect(admin.toastTitles).toHaveText(['Church confirmed']);
    await expect(admin.toastTexts).toHaveText([
      'St. Paul’s Anglican is now marked Verified on its members’ listings.',
    ]);
    await expect.poll(() => admin.fact('Church status')).toBe('Verified');
    await expect(admin.detailControls).toHaveText(['Approve', 'Remove']);
    await expect(admin.approve).toBeEnabled();
    await expect(admin.remove).toBeEnabled();
    // Confirming the church decides nothing: the new member still waits, still selected.
    await expect(admin.rows).toHaveCount(4);
    await expect(admin.summary).toHaveText('4 waiting · oldest first');
    await expect(admin.currentRow).toContainText(MEMBER_ROW.title);
    await expect(admin.currentRow).toBeFocused();
    expect(sent(api.requests)).toHaveLength(1);
    expect(api.bodies.get(CONFIRM)).toBeUndefined();
  });

  // L2-018 criterion 7: a verified church has no control.
  test('offers no control for a church that is verified', async ({ page, api }) => {
    const detail = DETAILS.get(MEMBER_ROW.id) as { member: { church: object } };
    answerDetail(api, MEMBER_ROW.id, {
      ...detail,
      member: { ...detail.member, church: { ...detail.member.church, isVerified: true } },
    });
    const admin = new AdminPage(page);
    await openOnMember(admin);

    await expect.poll(() => admin.fact('Church status')).toBe('Verified');
    await expect(admin.detailControls).toHaveText(['Approve', 'Remove']);
  });

  // L2-018 criterion 9.
  test('keeps the control when the confirmation failed, and tries it again', async ({
    page,
    api,
  }) => {
    api.refuse('POST', verificationOf(ST_PAULS.id), 500, 'server_error');
    const admin = new AdminPage(page);
    await openOnMember(admin);

    await admin.confirmChurch.click();

    await expect(admin.toastTitles).toHaveText(['The church wasn’t confirmed']);
    await expect(admin.toastTexts).toHaveText([
      'We couldn’t reach christian.rent. St. Paul’s Anglican is still not verified.',
    ]);
    await expect.poll(() => admin.fact('Church status')).toBe(UNCONFIRMED);
    await expect(admin.confirmChurch).toBeEnabled();
    await expect(admin.approve).toBeEnabled();

    answerChurchConfirmed(api);
    await admin.tryChurchAgain.click();

    await expect(admin.toastTitles).toHaveText(['Church confirmed']);
    await expect.poll(() => admin.fact('Church status')).toBe('Verified');
    await expect(admin.confirmChurch).toHaveCount(0);
    expect(sent(api.requests)).toHaveLength(2);
  });

  // L2-018 criterion 8: one change at a time.
  test('turns “Confirm church” off while a decision is in flight', async ({ page, api }) => {
    answerDecision(api, MEMBER_ROW.id);
    const admin = new AdminPage(page);
    await openOnMember(admin);
    const release = api.hold('POST', decisionOf(MEMBER_ROW.id));

    await admin.approve.click();

    await expect(admin.approve).toHaveAttribute('aria-busy', 'true');
    await expect(admin.confirmChurch).toBeDisabled();
    release();
    await expect(admin.toastTitles).toHaveText(['Approved']);
    expect(sent(api.requests)).toHaveLength(0);
  });

  // ADR 0031: leaving Admin gives up a confirmation on its way.
  test('gives up a confirmation on its way when the admin signs out', async ({ page, api }) => {
    answerSigningIn(api, NAOMI, ADMIN_SESSION);
    api.answer('GET', '/api/admin/session', { body: NAOMI });
    answerChurchConfirmed(api);
    const admin = new AdminPage(page);
    const signIn = new SignInPage(page);
    await openOnMember(admin);
    const release = api.hold('POST', verificationOf(ST_PAULS.id));
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith(verificationOf(ST_PAULS.id)),
    );
    await admin.confirmChurch.click();
    await expect(admin.confirmChurch).toHaveAttribute('aria-busy', 'true');

    await admin.signOut.click();

    await expect(signIn.heading).toHaveText('Sign in to Admin');
    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
    release();
  });
});
