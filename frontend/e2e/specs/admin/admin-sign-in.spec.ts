// Acceptance Test
// Traces to: L2-019, L2-038, L2-039, L2-040, L2-041
// Description: Admin has its own sign-in page: anyone not signed in to Admin lands there and is sent none of the review queue; an admin signs in and works the queue, and signs out of Admin alone; a session that ends leads back to sign in.
import { RENT_ORIGIN } from '../../fixtures/origins';
import { GARDEN_ROW, NAOMI, answerAdmin } from '../../fixtures/review';
import { ADMIN_SESSION, CREDENTIALS, answerSigningIn } from '../../fixtures/session';
import { SARAH_KIM } from '../../fixtures/members';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ForbiddenPage } from '../../pages/forbidden.page';
import { ScriptsPart } from '../../pages/scripts.part';
import { SignInPage } from '../../pages/sign-in.page';

/** The review page's selector, which only its own code names. */
const REVIEW_CODE = 'cr-review-page';

test.describe('Signing in to Admin', () => {
  // L2-038 criteria 1, 2 and 5; L2-019 criterion 5.
  test('takes anyone not signed in to Admin’s sign-in page, sends them nothing of the queue, and lets an admin in @critical', async ({
    page,
    api,
  }) => {
    answerAdmin(api);
    answerSigningIn(api, NAOMI, ADMIN_SESSION);
    const signIn = new SignInPage(page);
    const admin = new AdminPage(page);
    const scripts = new ScriptsPart(page);

    await page.goto('/');
    await expect(signIn.heading).toHaveText('Sign in to Admin');
    await expect(page).toHaveURL('/sign-in?return=%2F');
    await expect(page).toHaveTitle('Sign in · Admin · christian.rent');
    await expect(signIn.overline).toHaveText('Admin');
    await expect(signIn.goToSite).toHaveAttribute('href', `${RENT_ORIGIN}/`);
    await expect(signIn.note).toHaveText('Admin accounts are created by the christian.rent team.');
    await page.waitForLoadState('networkidle');
    expect(api.requests.filter((request) => request.includes('review-queue'))).toEqual([]);
    expect(await scripts.include(REVIEW_CODE)).toBe(false);

    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(admin.heading).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect(admin.navLabel).toHaveText('Admin · Naomi Friesen');
    expect(api.bodies.get('POST /api/admin/session')).toEqual([CREDENTIALS]);
  });

  // L2-038 criterion 3: a signed-in member who is not an admin is told so.
  test('tells a member who signs in that the page is for admins', async ({ page, api }) => {
    answerSigningIn(api, SARAH_KIM, ADMIN_SESSION);
    const signIn = new SignInPage(page);
    await signIn.open('return=%2F');

    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    const forbidden = new ForbiddenPage(page);
    await expect(forbidden.heading).toHaveText('This page is for admins.');
    await expect(forbidden.text).toHaveText(
      'You’re signed in as Sarah Kim, who isn’t an admin of christian.rent.',
    );
    expect(api.requests.filter((request) => request.includes('review-queue'))).toEqual([]);
  });

  // L2-038 criterion 4: one refusal, as in rent.
  test('refuses alike whatever was wrong', async ({ page, api }) => {
    api.refuse('POST', '/api/admin/session', 401, 'sign_in_failed');
    const signIn = new SignInPage(page);
    await signIn.open();

    await signIn.signIn(CREDENTIALS.email, 'not the password');

    await expect(signIn.alertTitle).toHaveText('That email and password don’t match an account.');
    await expect(signIn.password).toHaveValue('');
  });

  // L2-039 criterion 2; lesson L33: signing out leaves the review page, which gives up what it
  // was loading, and shows Admin's sign-in page.
  test('signs out of Admin from its navigation, giving up what the queue was loading', async ({
    page,
    api,
  }) => {
    answerAdmin(api);
    answerSigningIn(api, NAOMI, ADMIN_SESSION);
    api.answer('GET', '/api/admin/session', { body: NAOMI });
    const release = api.hold('GET', `/api/admin/review-queue/${GARDEN_ROW.id}`);
    const admin = new AdminPage(page);
    const signIn = new SignInPage(page);
    await admin.open();
    await expect(admin.rows).toHaveCount(4);
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith(`/api/admin/review-queue/${GARDEN_ROW.id}`),
    );

    await admin.signOut.click();

    await expect(signIn.heading).toHaveText('Sign in to Admin');
    await expect(page).toHaveURL('/sign-in');
    expect(api.requests).toContain('DELETE /api/admin/session');
    await aborted;
    release();
  });

  // L2-040 criterion 2: an Admin session that ends while the queue is open.
  test('takes an admin whose session ended to sign in, and back to the queue', async ({
    page,
    api,
  }) => {
    answerAdmin(api);
    const admin = new AdminPage(page);
    const signIn = new SignInPage(page);
    await admin.open();
    await expect(admin.approve).toBeVisible();
    api.refuse('POST', `/api/admin/review-queue/${GARDEN_ROW.id}/decision`, 401, 'not_signed_in');
    answerSigningIn(api, NAOMI, ADMIN_SESSION);

    await admin.approve.click();

    await expect(signIn.alertTitle).toHaveText('Your session ended.');
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);
    await expect(admin.heading).toBeVisible();
  });
});
