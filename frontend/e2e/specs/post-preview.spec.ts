// Acceptance Test
// Traces to: L2-010, L2-011, L2-022, L2-026
// Description: Post's preview is the card as Browse will show it, following every field: placeholders while empty, the member's church, and for a wanted listing no photo and the member's name.
import { answerMember } from '../fixtures/members';
import { expect, test } from '../fixtures/test';
import { PostPage } from '../pages/post.page';

test.describe('Post: the live preview', () => {
  test.beforeEach(({ api }) => answerMember(api));

  // L2-011 criteria 3, 4 and 5: an empty draft shows placeholders, the church and no photo.
  test('shows placeholders, the member’s church and "No photo yet" for an empty draft', async ({
    page,
  }) => {
    const post = new PostPage(page);

    await post.open();

    await expect(post.preview).toHaveClass(/listing-card--placeholder/);
    await expect(post.previewTitle).toHaveText('Your listing title');
    await expect(post.previewPrice).toHaveText('Price');
    await expect(post.previewPlace).toHaveText('Your area');
    await expect(post.previewChurch).toHaveText('Grace Community Church');
    await expect(post.previewTag).toHaveText('thing');
    await expect(post.previewPhoto).toHaveAccessibleName('No photo yet');
    await expect(post.preview).not.toContainText('undefined');
    await expect(post.aside.getByRole('link')).toHaveCount(0);
  });

  // L2-011 criterion 1; L2-022 criteria 1 and 6; L2-010 criterion 2: every change shows at once.
  test('follows every field as it is typed', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();

    await post.fillForRent();

    await expect(post.preview).not.toHaveClass(/listing-card--placeholder/);
    await expect(post.previewTitle).toHaveText('Pressure washer and drill kit');
    await expect(post.previewPrice).toHaveText('$25 / day');
    await expect(post.previewPlace).toHaveText('Willoughby, Langley');

    await post.price.fill('1250.50');
    await post.pricePer.selectOption('week');
    await post.space.check();

    await expect(post.previewPrice).toHaveText('$1,250.50 / week');
    await expect(post.previewTag).toHaveText('space');

    await post.price.fill('0');

    await expect(post.previewPrice).toHaveText('Free');
  });

  // L2-011 criteria 2 and 4; L2-010 criteria 4 and 14: a wanted listing has no photo, shows who
  // asks, when and "Up to" its budget, and no price without one.
  test('previews a wanted listing with no photo, the member’s name and "Up to"', async ({
    page,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await post.need.check();

    await post.title.fill('15-passenger van for youth camp');
    await post.price.fill('120');
    await post.giveDates.click();
    await post.from.fill('2026-07-14');
    await post.to.fill('2026-07-18');
    await post.area.fill('Murrayville, Langley');

    await expect(post.preview).toHaveClass(/listing-card--wanted/);
    await expect(post.previewPhoto).toHaveCount(0);
    await expect(post.preview.locator('img')).toHaveCount(0);
    await expect(post.previewTag).toHaveText('Wanted · thing');
    await expect(post.previewAsk).toHaveText('15-passenger van for youth camp');
    await expect(post.previewWhen).toHaveText('Jul 14 to 18, 2026');
    await expect(post.previewTitle).toHaveText('Sarah Kim');
    await expect(post.previewPrice).toHaveText('Up to $120 / day');
    await expect(post.previewPlace).toHaveText('Murrayville, Langley');

    await post.price.fill('');

    await expect(post.previewPrice).toHaveCount(0);
  });

  // L2-026 criterion 1: what the member writes is shown as text.
  test('shows HTML in the title as text', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();

    await post.title.fill('<b>Hall</b><img src=x onerror=alert(1)>');

    await expect(post.previewTitle).toHaveText('<b>Hall</b><img src=x onerror=alert(1)>');
    await expect(post.preview.locator('b, img')).toHaveCount(0);
  });
});
