// Acceptance Test
// Traces to: L2-015, L2-017, L2-025
// Description: A member's own listing offers no message box; a person who is not a member is asked to join before a message is sent, and their message and dates are kept while they do.
import { answerListing, hall } from '../../fixtures/listing';
import { SARAH_KIM, answerJoining, answerMember } from '../../fixtures/members';
import { answerSending, sentBodies } from '../../fixtures/messages';
import { expect, test } from '../../fixtures/test';
import { JoinDialogPart } from '../../pages/join-dialog.part';
import { ListingPage } from '../../pages/listing.page';

const TEXT = 'Hi Dan, is the hall free on the 13th?';

test.describe('Listing: who may send a message', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 5, 8, 10, 0));
  });

  // L2-015 criterion 6: on the member's own listing the panel shows the price and "This is
  // your listing.", and no way to write a message.
  test('a member’s own listing shows "This is your listing." and no message box', async ({
    page,
    api,
  }) => {
    answerMember(api, { ...SARAH_KIM, name: 'Josh Patel' });
    const listing = hall({
      title: 'Pressure washer and drill kit',
      price: { amount: 25, period: 'day' },
      isOwn: true,
    });
    answerListing(api, listing);
    const screen = new ListingPage(page);
    const box = screen.message;

    await screen.open(listing.id);

    await expect(box.ownTitle).toHaveText('This is your listing.');
    await expect(box.ownTitle).toHaveRole('heading');
    await expect(box.ownText).toHaveText(
      'Members who are interested send you a message from here.',
    );
    await expect(box.eyebrow).toHaveText('Rent for');
    await expect(box.price).toHaveText('$25 CAD / day');
    await expect(box.form).toHaveCount(0);
    await expect(box.root.locator('textarea, input, button')).toHaveCount(0);
  });

  // L2-015 criterion 5; L2-017: a person who is not a member writes a message, is asked to
  // join, and their message and dates are sent once they have.
  test('a person who is not a member joins and their message and dates are sent', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerJoining(api);
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    const box = screen.message;
    const dialog = new JoinDialogPart(page);
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-14');
    await box.text.fill(TEXT);

    await box.submit.click();

    await expect(dialog.title).toHaveText('Become a member to send a message');
    expect(sentBodies(api, listing.id)).toEqual([]);
    await dialog.fill('Sarah Kim', 'Grace Community Church, Langley');
    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(box.sentTitle).toHaveText('Sent to Dan');
    await expect(box.quote).toHaveText(`Jun 13 to 14, 2026 · “${TEXT}”`);
    expect(sentBodies(api, listing.id)).toEqual([
      { text: TEXT, startDate: '2026-06-13', endDate: '2026-06-14' },
    ]);
  });

  // L2-015 criterion 5; L2-025 criterion 3: a person who closes the dialog keeps their message
  // and dates, nothing is sent, and they are asked again the next time.
  test('a person who does not join keeps their message and dates, and nothing is sent', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerJoining(api);
    const screen = new ListingPage(page);
    const box = screen.message;
    const dialog = new JoinDialogPart(page);
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-14');
    await box.text.fill(TEXT);
    await box.submit.click();
    await expect(dialog.title).toHaveText('Become a member to send a message');

    await dialog.notNow.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(box.submit).toBeFocused();
    await expect(box.submit).not.toHaveAttribute('aria-busy');
    await expect(box.text).toHaveValue(TEXT);
    await expect(box.from).toHaveValue('2026-06-13');
    await expect(box.to).toHaveValue('2026-06-14');
    await page.reload();
    await expect(box.text).toHaveValue(TEXT);

    await box.submit.click();
    await expect(dialog.title).toHaveText('Become a member to send a message');
    expect(api.requests.filter((request) => request.startsWith('POST'))).toEqual([]);
  });
});
