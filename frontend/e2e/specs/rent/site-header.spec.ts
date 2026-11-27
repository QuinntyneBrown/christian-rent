import { answerNoListings } from '../../fixtures/listings';
import { SARAH_KIM, answerMember, answerNotAMember } from '../../fixtures/members';
import { answerSigningOut } from '../../fixtures/session';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';

test.describe('The site header', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-036 criteria 1 and 5; L2-023: nobody is signed in.
  test('shows the wordmark leading to Browse, Sign in and Post, and nothing else', async ({
    page,
  }) => {
    const browse = new BrowsePage(page);
    await browse.openAt('/?show=wanted');

    await expect(browse.header.logo).toHaveAccessibleName('christian.rent home');
    await expect(browse.header.logo).toHaveAttribute('href', '/');
    await expect(browse.header.post).toHaveAttribute('href', '/post');
    await expect(browse.header.signIn).toHaveAttribute(
      'href',
      '/sign-in?return=%2F%3Fshow%3Dwanted',
    );
    await expect(browse.header.controls).toHaveText(['christian.rent', 'Sign in', 'Post']);
    await expect(browse.header.messages).toHaveCount(0);
    await expect(browse.header.memberChip).toHaveCount(0);
  });

  // L2-036 criteria 1 and 2: a member's initials, as text, and Sign out.
  test('shows a member’s initials as text, Sign out and Post', async ({ page, api }) => {
    answerMember(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.memberChip).toHaveText('SK');
    await expect(browse.header.memberChip).toHaveAccessibleName(`Signed in as ${SARAH_KIM.name}`);
    await expect(browse.header.controls).toHaveText(['christian.rent', 'Sign out', 'Post']);
    await expect(browse.header.signIn).toHaveCount(0);
  });

  // L2-036 criterion 1: signed in, but not a member yet.
  test('shows Sign out alone to someone signed in who is not a member', async ({ page, api }) => {
    answerNotAMember(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.signOut).toBeVisible();
    await expect(browse.header.memberChip).toHaveCount(0);
  });

  // L2-039 criteria 1 and 5: signing out ends the session, stays on the screen, and forgets
  // what was kept in the tab.
  test('signs out, stays on Browse and forgets what was kept in the tab', async ({ page, api }) => {
    answerMember(api);
    answerSigningOut(api);
    const browse = new BrowsePage(page);
    await browse.open();
    await page.evaluate(() => sessionStorage.setItem('cr.post.draft', '{}'));

    await browse.header.signOut.click();

    await expect(browse.header.signIn).toBeVisible();
    await expect(browse.header.memberChip).toHaveCount(0);
    await expect(page).toHaveURL('/');
    expect(api.requests).toContain('DELETE /api/session');
    expect(await page.evaluate(() => sessionStorage.getItem('cr.post.draft'))).toBeNull();
  });

  // L2-023: ".rent" is in the brand orange.
  test('writes ".rent" in orange', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(browse.header.wordmarkTld).toHaveText('.rent');
    await expect(browse.header.wordmarkTld).toHaveCSS('color', 'rgb(255, 107, 61)');
  });

  // L2-031 criterion 6: every touch target is at least 44 × 44 px, signed out and signed in.
  for (const who of ['nobody', 'a member']) {
    test(`gives every control a touch target of at least 44 × 44 px for ${who}`, async ({
      page,
      api,
    }) => {
      if (who === 'a member') {
        answerMember(api);
      }
      await page.setViewportSize({ width: 320, height: 640 });
      const browse = new BrowsePage(page);
      await browse.open();
      await expect(browse.header.controls).toHaveCount(3);

      for (const control of await browse.header.controls.all()) {
        const box = await control.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });

    // L2-031 criterion 1; L2-036 criterion 5: nothing is cut off and nothing scrolls sideways
    // from 320 px; Sign in and Sign out keep their word as their name.
    test(`does not scroll sideways at 320 px for ${who}`, async ({ page, api }) => {
      if (who === 'a member') {
        answerMember(api);
      }
      await page.setViewportSize({ width: 320, height: 640 });
      const browse = new BrowsePage(page);
      await browse.open();
      const session = who === 'a member' ? browse.header.signOut : browse.header.signIn;

      await expect(browse.header.wordmark).toBeInViewport({ ratio: 1 });
      await expect(session).toBeInViewport({ ratio: 1 });
      await expect(session).toHaveAccessibleName(who === 'a member' ? 'Sign out' : 'Sign in');
      await expect(browse.header.post).toBeInViewport({ ratio: 1 });
      expect(await browse.scrollsSideways()).toBe(false);
    });
  }
});

test.describe('The skip link', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-032 criterion 8: the first control is "Skip to content", and it leads to the content.
  test('is the first control and moves focus to the content', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await page.keyboard.press('Tab');
    await expect(browse.skipLink).toBeFocused();
    await expect(browse.skipLink).toHaveText('Skip to content');
    await expect(browse.skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(browse.main).toBeFocused();
  });
});
