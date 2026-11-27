import { answerMember } from '../../fixtures/members';
import { RENT_ORIGIN } from '../../fixtures/origins';
import { answerAdmin } from '../../fixtures/review';
import { expect, test } from '../../fixtures/test';
import { AdminPage } from '../../pages/admin.page';
import { ForbiddenPage } from '../../pages/forbidden.page';
import { ScriptsPart } from '../../pages/scripts.part';

/** The admin screen's selector, which only the review page's own code names. */
const ADMIN_CODE = 'cr-review-page';

test.describe('Admin is for admins', () => {
  // L2-019 criteria 5 and 11; L2-038 criterion 3; L2-041 criterion 3.
  test('refuses a member who is not an admin, asks for no queue and sends them no review code', async ({
    page,
    api,
  }) => {
    answerMember(api);
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
    api.answer('GET', '/api/members/me', { status: 204 });
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.text).toHaveText(
      'You’re signed in, but not as an admin of christian.rent.',
    );
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
