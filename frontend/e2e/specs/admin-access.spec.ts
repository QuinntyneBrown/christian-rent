import { answerNoListings } from '../fixtures/listings';
import { SARAH_KIM, answerMember } from '../fixtures/members';
import { answerAdmin, answerQueue } from '../fixtures/review';
import { anyScriptHolds, recordScripts } from '../fixtures/scripts';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';
import { BrowsePage } from '../pages/browse.page';
import { ForbiddenPage } from '../pages/forbidden.page';

/** A selector only Admin's code holds: it is in a download only when Admin's code is. */
const ADMIN_CODE = 'cr-review-page';

test.describe('Admin’s address', () => {
  // L2-019 criteria 5 and 11: a member who is not an admin is told the page is for admins,
  // by name, and Admin's code and data are never downloaded.
  test('tells a member who is not an admin that it is for admins, and never loads Admin', async ({
    page,
    api,
  }) => {
    answerMember(api, SARAH_KIM);
    const scripts = recordScripts(page);
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.heading).toHaveText('This page is for admins.');
    await expect(forbidden.text).toHaveText(
      'You’re signed in as Sarah Kim, who isn’t an admin of christian.rent.',
    );
    await expect(forbidden.goToBrowse).toBeVisible();
    await expect(forbidden.header.wordmark).toHaveText('christian.rent');
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(await anyScriptHolds(scripts, ADMIN_CODE)).toBe(false);
    expect(api.requests.filter((request) => request.includes('/api/review-queue'))).toEqual([]);
  });

  // L2-019 criterion 11; ADR 0024: a person who is not a member at all is told so.
  test('tells a person who is not a member that it is for admins', async ({ page, api }) => {
    const scripts = recordScripts(page);
    const forbidden = new ForbiddenPage(page);

    await forbidden.open();

    await expect(forbidden.heading).toHaveText('This page is for admins.');
    await expect(forbidden.text).toHaveText('You’re not signed in as an admin of christian.rent.');
    expect(await anyScriptHolds(scripts, ADMIN_CODE)).toBe(false);
    expect(api.requests.filter((request) => request.includes('/api/review-queue'))).toEqual([]);
  });

  // L2-019 criterion 11: a way back to Browse.
  test('leads back to Browse', async ({ page, api }) => {
    answerMember(api, SARAH_KIM);
    answerNoListings(api);
    const forbidden = new ForbiddenPage(page);
    await forbidden.open();

    await forbidden.goToBrowse.click();

    await expect(page).toHaveURL('/');
    await expect(new BrowsePage(page).heading).toBeFocused();
  });

  // L2-019 criteria 1 and 5: an admin opens Admin, whose code loads only for them.
  test('opens Admin for an admin', async ({ page, api }) => {
    answerAdmin(api);
    answerQueue(api);
    const scripts = recordScripts(page);
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.heading).toHaveText('Review');
    await expect(page).toHaveTitle('Admin · christian.rent');
    expect(await anyScriptHolds(scripts, ADMIN_CODE)).toBe(true);
  });
});
