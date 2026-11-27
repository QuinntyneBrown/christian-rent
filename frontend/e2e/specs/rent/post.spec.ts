// Acceptance Test
// Traces to: L2-004, L2-005, L2-009, L2-024, L2-031, L2-032, L2-036
// Description: Post opens with the sentence "I have / need a space / a thing to rent out", whose words are named radio controls that switch the listing's offer and kind, its copy and its fields.
import { answerMember } from '../../fixtures/members';
import { expect, test } from '../../fixtures/test';
import { PostPage } from '../../pages/post.page';

test.describe('Post: what is being posted', () => {
  test.beforeEach(({ api }) => answerMember(api));

  // L2-009 criteria 5 and 6; L2-036 criterion 3; L2-024 criterion 1: Post opens set to "I have
  // a thing", with the plain header and nothing about payment.
  test('opens as "I have a thing to rent out" with the plain header', async ({ page }) => {
    const post = new PostPage(page);

    await post.open();

    await expect(page).toHaveTitle('Post · christian.rent');
    await expect(post.header.wordmark).toHaveText('christian.rent');
    await expect(post.header.close).toHaveAttribute('href', '/');
    await expect(post.header.post).toHaveCount(0);
    await expect(post.sentence).toHaveText(
      /^\s*I\s*have\s*need\s*a space\s*a thing\s*to rent out\.\s*$/,
    );
    await expect(post.have).toBeChecked();
    await expect(post.thing).toBeChecked();
    await expect(post.space).not.toBeChecked();
    await expect(post.labels).toHaveText([
      'What is it?',
      'Price',
      'When',
      'Where',
      'Photos 0 of 6',
      'Anything else? Optional',
    ]);
    await expect(post.pricePrefix).toHaveText('$');
    await expect(post.photos).toBeVisible();
    await expect(post.addPhoto).toBeEnabled();
    await expect(post.submit).toHaveText('Publish listing');
    await expect(post.fine).toHaveText(
      'Prices are in CAD. An admin reviews every post before it appears on Browse.',
    );
    await expect(post.main).not.toContainText(/deposit|card number|pay now|checkout/i);
  });

  // L2-009 criteria 1 and 5; L2-010 criterion 11: "need" makes a wanted listing: the sentence,
  // the labels and the button change, the budget is optional, and the photos field goes.
  test('switching "have" to "need" makes a wanted listing without photos', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();

    await post.need.check();

    await expect(post.need).toBeChecked();
    await expect(post.have).not.toBeChecked();
    await expect(post.sentence).toHaveText(/to rent\.\s*$/);
    await expect(post.labels).toHaveText([
      'What do you need?',
      'Your budget Optional',
      'When',
      'Where',
      'Anything else? Optional',
    ]);
    await expect(post.pricePrefix).toHaveText('Up to $');
    await expect(post.photos).toHaveCount(0);
    await expect(post.submit).toHaveText('Post request');
  });

  // L2-009 criteria 2 and 3; L2-032 criterion 2: the arrow keys move between the words, and
  // switching the kind keeps what was typed.
  test('the words switch by keyboard and keep the fields filled in', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await post.title.fill('Fellowship hall');

    await post.thing.focus();
    await page.keyboard.press('ArrowLeft');

    await expect(post.space).toBeChecked();
    await expect(post.space).toBeFocused();
    await expect(post.title).toHaveValue('Fellowship hall');

    await post.have.focus();
    await page.keyboard.press('ArrowRight');

    await expect(post.need).toBeChecked();
    await expect(post.title).toHaveValue('Fellowship hall');
  });

  // L2-005 criteria 2 and 3; L2-004 criterion 2: Browse's buttons and its no-results offer
  // open Post set to their choice, with the search as the title.
  test('opens set by the address Browse leads to', async ({ page }) => {
    const post = new PostPage(page);

    await post.open('?offer=wanted&title=15-passenger%20van');

    await expect(post.need).toBeChecked();
    await expect(post.title).toHaveValue('15-passenger van');
    await expect(post.submit).toHaveText('Post request');
  });

  // L2-031 criteria 1, 4 and 6: the preview is under the form on a phone and beside it from
  // 768 px; nothing scrolls sideways at 320 px, and each word is at least 44 px tall.
  test('puts the preview under the form on a phone and beside it from 768 px', async ({ page }) => {
    const post = new PostPage(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await post.open();
    await expect(post.previewHeading).toHaveText('How it’ll look');

    const form = (await post.form.boundingBox())!;
    const aside = (await post.aside.boundingBox())!;
    expect(aside.y).toBeGreaterThanOrEqual(form.y + form.height);
    expect(await post.scrollsSideways()).toBe(false);
    for (const word of [post.have, post.need, post.space, post.thing]) {
      const box = (await word.locator('..').boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    await page.setViewportSize({ width: 768, height: 900 });
    const wideForm = (await post.form.boundingBox())!;
    const wideAside = (await post.aside.boundingBox())!;
    expect(wideAside.x).toBeGreaterThanOrEqual(wideForm.x + wideForm.width);
    expect(wideAside.y).toBeLessThan(wideForm.y + wideForm.height);
  });
});
