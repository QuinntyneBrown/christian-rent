// Acceptance Test
// Traces to: L2-015, L2-016, L2-031, L2-032, L2-033
// Description: The message box's invalid, failed and limited states keep everything the member wrote: invalid fields are listed in a summary that takes focus, a failure offers "Try again", the limit says when sending reopens, and a draft survives a reload and leaving.
import { answerNoListings } from '../../fixtures/listings';
import { answerListing, hall } from '../../fixtures/listing';
import { answerMember } from '../../fixtures/members';
import { answerSending, refuseSendingAtLimit, sendPath, sentBodies } from '../../fixtures/messages';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';
import { ListingPage } from '../../pages/listing.page';

const TEXT =
  'Hi Dan, is the hall free on the dates below? We’re planning a baby shower for about 40 people.';

test.describe('Listing: the message box’s states', () => {
  const listing = hall();

  test.beforeEach(async ({ page, api }) => {
    // The mocks' today: Monday, Jun 8, 2026, at 2:50 p.m.
    await page.clock.setFixedTime(new Date(2026, 5, 8, 14, 50));
    answerMember(api);
    answerListing(api, listing);
  });

  async function write(screen: ListingPage): Promise<void> {
    await screen.open(listing.id);
    await screen.message.from.fill('2026-06-13');
    await screen.message.to.fill('2026-06-13');
    await screen.message.text.fill(TEXT);
  }

  // L2-015 criteria 3, 4 and 10; L2-032 criteria 3 and 5: every invalid field is marked at
  // once, the summary lists them and takes focus, its links move focus, and nothing is lost.
  test('lists an empty message and dates out of order in a summary that takes focus', async ({
    page,
    api,
  }) => {
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-12');

    await box.submit.click();

    await expect(box.summary).toBeFocused();
    await expect(box.summaryTitle).toHaveText('2 things need fixing before this can be sent.');
    await expect(box.summaryLinks).toHaveText(['Fix the dates', 'Write a message']);
    await expect(box.from).toHaveAttribute('aria-invalid', 'true');
    await expect(box.to).toHaveAttribute('aria-invalid', 'true');
    await expect(box.to).toHaveAccessibleDescription(
      'The end date is before the start date. Choose Jun 13, 2026 or later.',
    );
    await expect(box.text).toHaveAttribute('aria-invalid', 'true');
    await expect(box.text).toHaveAccessibleDescription(
      'Write a message of 1 to 1,000 characters. 0 / 1,000',
    );
    await expect(box.datesSummary).toHaveCount(0);
    await expect(box.from).toHaveValue('2026-06-13');
    await expect(box.to).toHaveValue('2026-06-12');
    expect(sentBodies(api, listing.id)).toEqual([]);

    await box.summaryLinks.nth(1).click();
    await expect(box.text).toBeFocused();
    await box.summaryLinks.first().press('Enter');
    await expect(box.from).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`/listings/${listing.id}$`));

    // The errors follow each change, and go once the fields are right.
    await box.text.fill('Hi Dan');
    await expect(box.summaryTitle).toHaveText('1 thing needs fixing before this can be sent.');
    await box.to.fill('2026-06-14');
    await expect(box.summary).toHaveCount(0);
    await expect(box.datesSummary).toHaveText('Jun 13 to 14, 2026 · 2 days');
  });

  // L2-015 criterion 3; ADR 0022: a start in the past, and one date without the other.
  test('refuses a start date in the past and one date without the other', async ({ page, api }) => {
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);
    await box.text.fill('Hi Dan');
    await box.from.fill('2026-06-07');
    await box.to.fill('2026-06-09');

    await box.submit.click();

    await expect(box.summaryLinks).toHaveText(['Fix the dates']);
    await expect(box.from).toHaveAccessibleDescription(
      'The start date is in the past. Choose Jun 8, 2026 or later.',
    );
    await expect(box.to).not.toHaveAttribute('aria-invalid');

    await box.from.fill('');
    await expect(box.summaryLinks).toHaveText(['Choose the dates']);
    await expect(box.from).toHaveAccessibleDescription('Choose a start and an end date.');
    expect(sentBodies(api, listing.id)).toEqual([]);
  });

  // ADR 0022: dates are optional on a message about a listing for rent.
  test('sends a message about a listing for rent with no dates', async ({ page, api }) => {
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    await screen.open(listing.id);
    await screen.message.text.fill('When is the hall free?');

    await screen.message.submit.click();

    await expect(screen.message.quote).toHaveText('“When is the hall free?”');
    expect(sentBodies(api, listing.id)).toEqual([
      { text: 'When is the hall free?', startDate: null, endDate: null },
    ]);
  });

  // L2-015 criterion 7; L2-033 criterion 2: a failure is announced, keeps the text and dates,
  // and "Try again" sends the same message.
  test('keeps the message and dates when sending fails, and "Try again" sends them', async ({
    page,
    api,
  }) => {
    api.refuse('POST', sendPath(listing.id), 503, 'unexpected');
    const screen = new ListingPage(page);
    const box = screen.message;
    await write(screen);

    await box.submit.click();

    await expect(box.alert).toHaveAttribute('role', 'alert');
    await expect(box.alert).toHaveClass(/alert--danger/);
    await expect(box.alertTitle).toHaveText('Your message wasn’t sent.');
    await expect(box.alertText).toHaveText(
      'We couldn’t reach christian.rent. Your message and dates are still here.',
    );
    await expect(box.heading).toHaveText('Message Dan about this listing');
    await expect(box.submit).toHaveText('Try again');
    await expect(box.submit).toBeEnabled();
    await expect(box.text).toHaveValue(TEXT);
    await expect(box.from).toHaveValue('2026-06-13');
    await expect(box.datesSummary).toHaveText('Sat, Jun 13, 2026 · one day');
    await expect(box.root).not.toContainText(/503|unexpected/);

    answerSending(api, listing.id);
    await box.submit.click();

    await expect(box.sentTitle).toHaveText('Sent to Dan');
    expect(sentBodies(api, listing.id)).toEqual([
      { text: TEXT, startDate: '2026-06-13', endDate: '2026-06-13' },
      { text: TEXT, startDate: '2026-06-13', endDate: '2026-06-13' },
    ]);
  });

  // L2-016 criteria 4 and 6: the limit of 20 an hour says when sending reopens, keeps the text
  // and dates, and turns the send button off.
  test('says when sending reopens at the limit, keeps everything and turns the button off', async ({
    page,
    api,
  }) => {
    refuseSendingAtLimit(api, listing.id, new Date(2026, 5, 8, 15, 40));
    const screen = new ListingPage(page);
    const box = screen.message;
    await write(screen);

    await box.submit.click();

    await expect(box.alert).toHaveAttribute('role', 'alert');
    await expect(box.alert).toHaveClass(/alert--warning/);
    await expect(box.alertTitle).toHaveText('You’ve sent 20 messages in the last hour.');
    await expect(box.alertText).toHaveText(
      'You can send another at 3:40 p.m. Your message and dates are still here.',
    );
    await expect(box.submit).toBeDisabled();
    await expect(box.submit).toHaveText('Message Dan');
    await expect(box.text).toHaveValue(TEXT);
    await expect(box.to).toHaveValue('2026-06-13');
    expect(sentBodies(api, listing.id)).toHaveLength(1);
  });

  // L2-015 criterion 7; ADR 0022: a listing taken down while the member wrote shows that it is
  // not there, and the message is kept for it.
  test('shows that the listing is not there when it was taken down, and keeps the message', async ({
    page,
    api,
  }) => {
    api.refuse('POST', sendPath(listing.id), 404, 'not_found');
    const screen = new ListingPage(page);
    await write(screen);
    api.refuse('GET', `/api/listings/${listing.id}`, 404, 'not_found');

    await screen.message.submit.click();

    await expect(screen.heading).toHaveText('This listing isn’t here.');
    answerListing(api, listing);
    await page.reload();
    await expect(screen.message.text).toHaveValue(TEXT);
  });

  // L2-015 criterion 14; ADR 0022: what was typed survives a reload and coming back in the
  // same tab, per listing, and is cleared once it is sent.
  test('keeps what was typed through a reload and a visit to Browse, until it is sent', async ({
    page,
    api,
  }) => {
    answerSending(api, listing.id);
    answerNoListings(api);
    const screen = new ListingPage(page);
    const box = screen.message;
    await write(screen);

    await page.reload();
    await expect(box.text).toHaveValue(TEXT);
    await expect(box.from).toHaveValue('2026-06-13');
    await expect(box.summary).toHaveCount(0);

    await screen.allListings.click();
    await expect(new BrowsePage(page).haveSomethingToRent.first()).toBeVisible();
    await page.goBack();
    await expect(box.text).toHaveValue(TEXT);

    await box.submit.click();
    await expect(box.sentTitle).toHaveText('Sent to Dan');
    await page.reload();
    await expect(box.text).toHaveValue('');
    await expect(box.from).toHaveValue('');
  });

  // ADR 0022: leaving Listing while a message is sent cancels the request and keeps the draft.
  test('leaving while a message is sent cancels the request and keeps the draft', async ({
    page,
    api,
  }) => {
    answerSending(api, listing.id);
    answerNoListings(api);
    api.hold('POST', sendPath(listing.id));
    const screen = new ListingPage(page);
    await write(screen);
    const failed = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/messages'),
    );
    await screen.message.submit.click();
    await expect(screen.message.submit).toHaveAttribute('aria-busy', 'true');

    await screen.allListings.click();

    expect((await failed).failure()?.errorText).toBe('net::ERR_ABORTED');
    await expect(new BrowsePage(page).haveSomethingToRent.first()).toBeVisible();
    await page.goBack();
    await expect(screen.message.text).toHaveValue(TEXT);
  });

  // L2-031; L2-032: every control of the box is at least 44 × 44 px, and at 320 px nothing
  // scrolls sideways, with the summary and both errors showing.
  test('gives every control a 44 px target and fits a phone 320 px wide', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-12');
    await box.submit.click();
    await expect(box.summary).toBeFocused();

    for (const control of [box.from, box.to, box.text, box.submit]) {
      const size = (await control.boundingBox())!;
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
    expect(await screen.scrollsSideways()).toBe(false);
  });
});
