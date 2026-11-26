// Acceptance Test
// Traces to: L2-015, L2-016, L2-022, L2-024, L2-026
// Description: A member sends a message from the Listing screen, with dates when the listing is for rent; the box is busy while it is sent, and "Sent to" the person who posted replaces it, quoting the message back as text.
import { answerListing, hall, van } from '../fixtures/listing';
import { answerMember } from '../fixtures/members';
import { answerSending, sendPath, sentBodies } from '../fixtures/messages';
import { expect, test } from '../fixtures/test';
import { ListingPage } from '../pages/listing.page';

const TEXT =
  'Hi Dan, is the hall free on the dates below? We’re planning a baby shower for about 40 people.';

test.describe('Listing: sending a message', () => {
  test.beforeEach(async ({ page, api }) => {
    // The mocks' today: Monday, Jun 8, 2026.
    await page.clock.setFixedTime(new Date(2026, 5, 8, 10, 0));
    answerMember(api);
  });

  // L2-015 criteria 1, 2, 8, 9 and 12; L2-022 criterion 9; L2-024 criteria 1 and 3.
  test('a member messages the person who posted, with dates, and sees "Sent to Dan" @critical', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);

    await expect(box.heading).toHaveText('Message Dan about this listing');
    await expect(box.eyebrow).toHaveText('Rent for');
    await expect(box.price).toHaveText('$45 CAD / hour');
    await expect(box.from).toHaveValue('');
    await expect(box.text).toHaveValue('');
    await expect(box.text).toHaveAttribute('maxlength', '1000');
    await expect(box.counter).toHaveText('0 / 1,000');
    await expect(box.submit).toHaveText('Message Dan');
    await expect(box.submit).toHaveClass(/btn--rent/);
    await expect(box.fine).toHaveText(
      'No payment happens here. You’ll agree the details together.',
    );
    await expect(box.root.locator('input:not([type="date"]), [role="grid"]')).toHaveCount(0);

    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-13');
    await box.text.fill(TEXT);
    await expect(box.datesSummary).toHaveText('Sat, Jun 13, 2026 · one day');
    await expect(box.counter).toHaveText('94 / 1,000');
    await box.to.fill('2026-06-15');
    await expect(box.datesSummary).toHaveText('Jun 13 to 15, 2026 · 3 days');

    await box.submit.click();

    await expect(box.sentTitle).toHaveText('Sent to Dan');
    await expect(box.sentTitle).toBeFocused();
    await expect(box.sent).toHaveAttribute('role', 'status');
    await expect(box.sentText).toHaveText(
      'Dan can read your message and reply to you. Nothing is booked or paid here; you’ll agree the details together.',
    );
    await expect(box.quote).toHaveText(`Jun 13 to 15, 2026 · “${TEXT}”`);
    await expect(box.backToAllListings).toHaveAttribute('href', '/');
    await expect(box.form).toHaveCount(0);
    await expect(box.sent).not.toContainText(/email|inbox|edit/i);
    expect(sentBodies(api, listing.id)).toEqual([
      { text: TEXT, startDate: '2026-06-13', endDate: '2026-06-15' },
    ]);
    // The listing is as it was: nothing is reserved.
    await expect(screen.facts).toContainText(['Weekdays and Saturdays']);
  });

  // L2-015 criteria 2 and 8: a wanted listing's box has no dates, and offers to help.
  test('a member offers to help with a wanted listing, without dates', async ({ page, api }) => {
    const listing = van();
    answerListing(api, listing);
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);

    await expect(box.heading).toHaveText('Offer to help Marcus about this listing');
    await expect(box.eyebrow).toHaveText('They’ll pay');
    await expect(box.price).toHaveText('Up to $120 CAD / day');
    await expect(box.root.locator('input')).toHaveCount(0);
    await expect(box.submit).toHaveText('Offer to help Marcus');
    await expect(box.submit).toHaveClass(/btn--wanted/);

    await box.text.fill('  I think I can help with this.\n\nWe have a van that week.  ');
    await box.submit.click();

    await expect(box.sentTitle).toHaveText('Sent to Marcus');
    await expect(box.quote).toHaveText(
      '“I think I can help with this.\n\nWe have a van that week.”',
      {
        useInnerText: true,
      },
    );
    expect(sentBodies(api, listing.id)).toEqual([
      {
        text: 'I think I can help with this.\n\nWe have a van that week.',
        startDate: null,
        endDate: null,
      },
    ]);
  });

  // L2-015 criterion 13: a wanted listing that gave no price has a box with no price.
  test('a wanted listing with no price has a message box without one', async ({ page, api }) => {
    const listing = van({ price: null });
    answerListing(api, listing);
    const screen = new ListingPage(page);
    await screen.open(listing.id);

    await expect(screen.message.heading).toHaveText('Offer to help Marcus about this listing');
    await expect(screen.message.price).toHaveCount(0);
    await expect(screen.message.eyebrow).toHaveCount(0);
    await expect(screen.message.submit).toHaveText('Offer to help Marcus');
  });

  // L2-015 criterion 11: while the message is sent the button is busy, the fields cannot be
  // changed, and a second press sends nothing more.
  test('the box is busy while the message is sent', async ({ page, api }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSending(api, listing.id);
    const release = api.hold('POST', sendPath(listing.id));
    const screen = new ListingPage(page);
    const box = screen.message;
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-13');
    await box.text.fill(TEXT);

    await box.submit.click();

    await expect(box.submit).toHaveAttribute('aria-busy', 'true');
    await expect(box.form).toHaveAttribute('aria-busy', 'true');
    await expect(box.text).toHaveJSProperty('readOnly', true);
    await expect(box.from).toHaveJSProperty('readOnly', true);
    await expect(box.to).toHaveJSProperty('readOnly', true);
    await box.submit.dispatchEvent('click');
    release();
    await expect(box.sentTitle).toHaveText('Sent to Dan');
    await expect(box.quote).toHaveText(`Sat, Jun 13, 2026 · “${TEXT}”`);
    expect(sentBodies(api, listing.id)).toHaveLength(1);
  });

  // L2-026 criterion 1: what a member writes is quoted back as text, and nothing runs.
  test('quotes HTML in a message back as text', async ({ page, api }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    await screen.open(listing.id);
    const html = '<img src=x onerror="document.title=1"><b>bold</b>';

    await screen.message.text.fill(html);
    await screen.message.submit.click();

    await expect(screen.message.quote).toHaveText(`“${html}”`);
    await expect(screen.message.quote.locator('img, b')).toHaveCount(0);
    await expect(page).toHaveTitle('Sunlit fellowship hall for 80 · christian.rent');
  });
});
