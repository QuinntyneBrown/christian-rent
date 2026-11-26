import { answerNoListings } from '../fixtures/listings';
import { answerMember } from '../fixtures/members';
import { answerAdmin } from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';
import { BrowsePage } from '../pages/browse.page';
import { ForbiddenPage } from '../pages/forbidden.page';
import { ScriptsPart } from '../pages/scripts.part';

/** The admin screen's selector, which only Admin's own code names. */
const ADMIN_CODE = 'cr-review-page';

test.describe('Admin is for admins', () => {
  // L2-018 criterion 3; L2-019 criterion 5.
  test('refuses a member who is not an admin, asks for no queue and sends them no Admin code @critical', async ({
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
    await expect(forbidden.header.wordmark).toHaveText('christian.rent');
    await expect(forbidden.goToBrowse).toBeVisible();
    await expect(page).toHaveURL('/admin');
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(api.requests.filter((request) => request.includes('/api/review-queue'))).toEqual([]);
    await page.waitForLoadState('networkidle');
    expect(await scripts.include(ADMIN_CODE)).toBe(false);
  });

  // L2-019 criterion 22: nobody signed in as a member.
  test('says to someone nobody knows that they are not signed in as an admin', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    const forbidden = new ForbiddenPage(page);
    await forbidden.open();

    await expect(forbidden.text).toHaveText('You aren’t signed in as an admin of christian.rent.');
    await forbidden.goToBrowse.click();

    await expect(page).toHaveURL('/');
    await expect(new BrowsePage(page).heading).toBeFocused();
  });

  // L2-019 criterion 22: a person who cannot be identified is refused alike.
  test('refuses when who is signed in cannot be asked', async ({ page, api }) => {
    api.refuse('GET', '/api/members/me', 401, 'not_signed_in');
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.text).toHaveText('You aren’t signed in as an admin of christian.rent.');
  });

  // L2-019 criterion 1. It also proves the check above can see Admin's code.
  test('opens Admin to an admin, with its code', async ({ page, api }) => {
    answerAdmin(api);
    const scripts = new ScriptsPart(page);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.heading).toBeVisible();
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(await scripts.include(ADMIN_CODE)).toBe(true);
  });
});
