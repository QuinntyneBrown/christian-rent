import { answerNoListings } from '../fixtures/listings';
import { answerMember } from '../fixtures/members';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { PostPage } from '../pages/post.page';

test.describe('The application shell', () => {
  test.beforeEach(({ api }) => answerNoListings(api));

  // L2-023 criterion 1: the wordmark reads "christian.rent" in lowercase.
  test('the home page shows the christian.rent wordmark @critical', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.open();

    await expect(browse.header.wordmark).toHaveText('christian.rent');
  });

  // L2-032 criterion 4; ADR 0020: moving to another screen announces its title, through the
  // CDK's live announcer, which loads when it is first needed.
  test('announces the title of the next screen', async ({ page, api }) => {
    answerMember(api);
    const browse = new BrowsePage(page);
    await browse.open();

    await browse.header.post.click();

    await expect(new PostPage(page).sentence).toBeVisible();
    await expect(page.locator('.cdk-live-announcer-element')).toHaveText('Post · christian.rent');
  });
});
