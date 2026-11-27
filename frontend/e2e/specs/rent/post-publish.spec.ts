// Acceptance Test
// Traces to: L2-010, L2-012, L2-024, L2-032
// Description: A member publishes a listing: the request carries the draft once per client request, the form is busy while it is sent, and "Sent for review" says truthfully that it is not public yet.
import { answerMember } from '../../fixtures/members';
import { answerPosting } from '../../fixtures/post';
import { expect, test } from '../../fixtures/test';
import { PostPage } from '../../pages/post.page';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.describe('Post: publishing', () => {
  test.beforeEach(({ api }) => {
    answerMember(api);
    answerPosting(api);
  });

  // L2-012 criteria 1, 2 and 9; L2-032 criterion 4: a valid listing for rent is sent and
  // "Sent for review" replaces the form, with the card, "Back to browsing" and "Post another".
  test('a member publishes a listing for rent and sees "Sent for review" @critical', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();

    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    await expect(post.heading).toBeFocused();
    await expect(post.confirmation).toHaveAttribute('role', 'status');
    await expect(post.confirmationText).toHaveText(
      'Your listing will appear on Browse once an admin has looked at it. It isn’t public yet.',
    );
    await expect(post.confirmationCard.getByRole('heading', { level: 2 })).toHaveText(
      'Pressure washer and drill kit',
    );
    await expect(post.backToBrowsing).toHaveAttribute('href', '/');
    await expect(post.postAnother).toBeVisible();
    await expect(post.confirmation.getByRole('link')).toHaveCount(1);
    await expect(post.confirmation).not.toContainText(/edit/i);
    await expect(post.form).toHaveCount(0);
    const [body] = api.bodies.get('POST /api/listings') as [Record<string, unknown>];
    expect(body).toEqual({
      clientRequestId: expect.stringMatching(UUID),
      offer: 'for-rent',
      kind: 'thing',
      title: 'Pressure washer and drill kit',
      priceAmount: 25,
      pricePeriod: 'day',
      whenText: 'Most weekends',
      startDate: null,
      endDate: null,
      area: 'Willoughby, Langley',
      note: 'Pick up from my garage. Happy to show you how it works.',
      photoIds: [],
    });
  });

  // L2-012 criterion 2; L2-010 criterion 4: a wanted listing with dates and no budget.
  test('a member posts a wanted request with dates and no budget', async ({ page, api }) => {
    const post = new PostPage(page);
    await post.open('?offer=wanted');
    await post.title.fill('  15-passenger   van for youth camp ');
    await post.giveDates.click();
    await post.from.fill('2026-07-14');
    await post.to.fill('2026-07-18');
    await post.area.fill('Murrayville, Langley');

    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    await expect(post.confirmationText).toHaveText(
      'Your request will appear on Browse once an admin has looked at it. It isn’t public yet.',
    );
    await expect(post.confirmation.locator('.success-badge')).toHaveClass(/success-badge--wanted/);
    await expect(post.confirmationCard.getByRole('heading', { level: 2 })).toHaveText(
      '15-passenger van for youth camp',
    );
    const [body] = api.bodies.get('POST /api/listings') as [Record<string, unknown>];
    expect(body).toMatchObject({
      offer: 'wanted',
      title: '15-passenger van for youth camp',
      priceAmount: null,
      pricePeriod: null,
      whenText: null,
      startDate: '2026-07-14',
      endDate: '2026-07-18',
      note: null,
    });
  });

  // L2-012 criteria 4 and 8: while the listing is sent the button is busy and cannot be pressed
  // again, and the fields cannot be changed.
  test('keeps the form busy and unchangeable while the listing is sent', async ({ page, api }) => {
    const release = api.hold('POST', '/api/listings');
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();

    await post.submit.click();

    await expect(post.submit).toHaveAttribute('aria-busy', 'true');
    await expect(post.form).toHaveAttribute('aria-busy', 'true');
    await expect(post.title).toHaveJSProperty('readOnly', true);
    await expect(post.note).toHaveJSProperty('readOnly', true);
    await expect(post.pricePer).toBeDisabled();
    await expect(post.need).toBeDisabled();
    await expect(post.giveDates).toBeDisabled();
    await post.submit.dispatchEvent('click');
    await post.title.press('End');
    await page.keyboard.type('!');
    await expect(post.title).toHaveValue('Pressure washer and drill kit');

    release();

    await expect(post.heading).toHaveText('Sent for review');
    expect(api.requests.filter((request) => request === 'POST /api/listings')).toHaveLength(1);
  });

  // L2-012 criterion 11; ADR 0019: once sent, the draft is gone; "Post another" starts afresh.
  test('"Post another" starts a new draft, and the sent one is not kept', async ({ page }) => {
    const post = new PostPage(page);
    await post.open('?offer=wanted');
    await post.title.fill('Folding chairs');
    await post.when.fill('Sat, Aug 8');
    await post.area.fill('Abbotsford');
    await post.submit.click();
    await expect(post.heading).toHaveText('Sent for review');

    await post.postAnother.click();

    await expect(post.need).toBeChecked();
    await expect(post.title).toHaveValue('');
    await expect(post.summary).toHaveCount(0);

    await page.reload();

    await expect(post.title).toHaveValue('');
  });
});
