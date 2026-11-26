// Acceptance Test
// Traces to: L2-010, L2-012, L2-022, L2-032
// Description: Post's fields keep to their limits, "when" switches between words and dates, every invalid field is marked at once with a summary that takes focus, and the draft survives a reload.
import { answerMember } from '../fixtures/members';
import { expect, test } from '../fixtures/test';
import { PostPage } from '../pages/post.page';

test.describe('Post: the fields', () => {
  test.beforeEach(({ api }) => answerMember(api));

  // L2-010 criteria 13 and 15: the limits, the area's hint and the note's counter.
  test('keeps each field to its limit and counts the note', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();

    await post.note.fill('Pick up from my garage. Happy to show you how it works.');

    await expect(post.noteCounter).toHaveText('55 / 1,000');
    await expect(post.note).toHaveAccessibleDescription('55 / 1,000');
    await expect(post.title).toHaveAttribute('maxlength', '80');
    await expect(post.when).toHaveAttribute('maxlength', '80');
    await expect(post.note).toHaveAttribute('maxlength', '1000');
    await expect(post.area).toHaveAccessibleDescription(
      'A city or neighbourhood in Canada. Never a street address.',
    );
    await expect(post.pricePer).toHaveValue('day');
  });

  // L2-010 criteria 5 and 10; L2-022 criterion 7: "when" in words or as two dates, and back.
  test('gives "when" as dates instead of words, and back again', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await post.when.fill('Most weekends');

    await post.giveDates.click();

    await expect(post.when).toHaveCount(0);
    await expect(post.dates).toBeVisible();
    await post.from.fill('2026-06-20');
    await post.to.fill('2026-08-30');
    await expect(post.datesSummary).toHaveText('Jun 20 to Aug 30, 2026');

    await post.describeInWords.click();

    await expect(post.when).toHaveValue('Most weekends');
    await expect(post.dates).toHaveCount(0);
  });

  // L2-010 criteria 1, 2, 6 and 8; L2-032 criteria 3 to 5: every invalid field is marked at
  // once, the summary lists them and takes focus, each entry leads to its field, nothing typed
  // is lost and nothing is sent.
  test('marks every invalid field at once under a summary that takes focus', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await post.title.fill('PW');
    await post.price.fill('250000');
    await post.when.fill('Most weekends');

    await post.submit.click();

    await expect(post.summary).toBeFocused();
    await expect(post.summary.locator('.alert__title')).toHaveText(
      '3 things need fixing before this can be posted.',
    );
    await expect(post.summaryLinks).toHaveText([
      'Make the title longer',
      'Lower the price',
      'Say where it is',
    ]);
    await expect(post.title).toHaveAttribute('aria-invalid', 'true');
    await expect(post.title).toHaveAccessibleDescription(
      'A title is 3 to 80 characters. This one is 2.',
    );
    await expect(post.price).toHaveAccessibleDescription(
      'A price is between $0 and $100,000. Enter 0 to offer it free.',
    );
    await expect(post.area).toHaveAccessibleDescription(
      'Enter a city or neighbourhood in Canada, such as “Willoughby, Langley”.',
    );
    await expect(post.when).not.toHaveAttribute('aria-invalid', 'true');
    await expect(post.title).toHaveValue('PW');
    await expect(post.price).toHaveValue('250000');

    await post.summaryLinks.nth(1).click();

    await expect(post.price).toBeFocused();
    expect(api.requests.filter((request) => request.startsWith('POST'))).toEqual([]);
  });

  // L2-010 criteria 5 and 12: no "when", and an end before the start, say why.
  test('refuses an empty "when" and an end date before the start', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();
    await post.when.fill('');

    await post.submit.click();

    await expect(post.summaryLinks).toHaveText(['Say when']);
    await expect(post.when).toHaveAccessibleDescription(
      'Say when it’s available, such as “Most weekends”.',
    );

    await post.giveDates.click();
    await post.from.fill('2026-07-18');
    await post.to.fill('2026-07-14');
    await post.submit.click();

    await expect(post.summaryLinks).toHaveText(['Fix the dates']);
    await expect(post.to).toHaveAttribute('aria-invalid', 'true');
    await expect(post.to).toHaveAccessibleDescription('The end date is before the start date.');
  });

  // L2-012 criterion 11; ADR 0019: the draft is kept in the tab across a reload.
  test('keeps the draft across a reload', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await post.need.check();
    await post.space.check();
    await post.title.fill('Small office for weekly counselling');
    await post.giveDates.click();
    await post.from.fill('2026-07-14');

    await page.reload();

    await expect(post.need).toBeChecked();
    await expect(post.space).toBeChecked();
    await expect(post.title).toHaveValue('Small office for weekly counselling');
    await expect(post.from).toHaveValue('2026-07-14');
  });
});
