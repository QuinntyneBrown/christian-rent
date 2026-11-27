import { SARAH_KIM } from '../../fixtures/members';
import { RENT_ORIGIN } from '../../fixtures/origins';
import { ADMIN_SESSION, answerSigningOut } from '../../fixtures/session';
import { answerAdmin } from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ForbiddenPage } from '../../pages/forbidden.page';
import { ScriptsPart } from '../../pages/scripts.part';
import { SignInPage } from '../../pages/sign-in.page';

/** The admin screen's selector, which only the review page's own code names. */
const ADMIN_CODE = 'cr-review-page';

test.describe('Admin is for admins', () => {
  // L2-019 criteria 5 and 11; L2-038 criterion 3; L2-041 criterion 3.
  test('refuses a member who is not an admin, asks for no queue and sends them no review code', async ({
    page,
    api,
  }) => {
    api.answer('GET', '/api/admin/session', { body: SARAH_KIM });
    const scripts = new ScriptsPart(page);
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.heading).toHaveText('This page is for admins.');
    await expect(forbidden.text).toHaveText(
      'You’re signed in as Sarah Kim, who isn’t an admin of christian.rent.',
    );
    await expect(forbidden.wordmark).toHaveText('christian.rent');
    await expect(forbidden.label).toHaveText('Admin');
    await expect(forbidden.goToSite).toHaveAttribute('href', `${RENT_ORIGIN}/`);
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(api.requests.filter((request) => request.includes('review-queue'))).toEqual([]);
    await page.waitForLoadState('networkidle');
    expect(await scripts.include(ADMIN_CODE)).toBe(false);
  });

  // L2-019 criterion 22: signed in, but no member.
  test('says to someone signed in who is not a member that they are not an admin', async ({
    page,
    api,
  }) => {
    api.answer('GET', '/api/admin/session', { status: 204 });
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.text).toHaveText(
      'You’re signed in, but not as an admin of christian.rent.',
    );
  });

  // L2-039 criterion 2: the forbidden page signs out of Admin alone.
  test('lets someone who is not an admin sign out', async ({ page, api }) => {
    api.answer('GET', '/api/admin/session', { body: SARAH_KIM });
    answerSigningOut(api, ADMIN_SESSION);
    const forbidden = new ForbiddenPage(page);
    const signIn = new SignInPage(page);
    await forbidden.open();

    await forbidden.signOut.click();

    await expect(signIn.heading).toHaveText('Sign in to Admin');
    expect(api.requests).toContain('DELETE /api/admin/session');
  });

  // L2-019 criterion 22: Admin cannot tell who is signed in.
  test('says so when it cannot tell who is signed in, and tries again', async ({ page, api }) => {
    api.answer('GET', '/api/admin/session', { status: 503 });
    const forbidden = new ForbiddenPage(page);
    await forbidden.open();

    await expect(forbidden.heading).toHaveText('We couldn’t reach Admin.');
    answerAdmin(api);
    await forbidden.tryAgain.click();

    await expect(new AdminPage(page).heading).toBeVisible();
  });

  // L2-019 criterion 1. It also proves the check above can see the review page's code.
  test('opens Admin to an admin, at its own root, with its code', async ({ page, api }) => {
    answerAdmin(api);
    const scripts = new ScriptsPart(page);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.heading).toBeVisible();
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(await scripts.include(ADMIN_CODE)).toBe(true);
  });
});
