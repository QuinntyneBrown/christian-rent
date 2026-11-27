// Acceptance Test
// Traces to: L2-021, L2-032
// Description: What reporting a listing comes to besides success: a send that fails keeps what was entered, a listing already reported says so with the date, someone who is not a member joins first, a listing taken down meanwhile is said to be gone, and no Report on the member's own listing.
import { answerListing, hall, listingPath } from '../../fixtures/listing';
import { answerJoining, answerMember } from '../../fixtures/members';
import {
  answerReporting,
  refuseAsAlreadyReported,
  reportBodies,
  reportPath,
} from '../../fixtures/reports';
import { expect, test } from '../../fixtures/test';
import { JoinDialogPart } from '../../pages/join-dialog.part';
import { ListingPage } from '../../pages/listing.page';
import { ReportDialogPart } from '../../pages/report-dialog.part';

const NOTE = 'It asks people to pay a deposit before they have seen the hall.';
/** Noon in the browser's own time zone, so the date reads the same wherever the spec runs. */
const REPORTED_AT = new Date(2026, 5, 6, 12);
const ALREADY = 'You’ve already reported this listing.';
const ALREADY_TEXT = 'You reported this listing on Jun 6, 2026. There’s no need to send it again.';

test.describe('Listing: what else reporting comes to', () => {
  test.beforeEach(async ({ api }) => {
    answerMember(api);
    answerListing(api, hall());
  });

  // L2-021 criterion 9: what was entered stays, and it can be sent again.
  test('a report that fails keeps the reason and note, and Try again sends it', async ({
    page,
    api,
  }) => {
    api.refuse('POST', reportPath(hall().id), 503, 'unexpected');
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await dialog.reason('A scam').check();
    await dialog.note.fill(NOTE);

    await dialog.submit.click();

    await expect(dialog.alertTitle).toHaveText('Your report wasn’t sent.');
    await expect(dialog.alertText).toHaveText(
      'We couldn’t reach christian.rent. Your reason and note are still here.',
    );
    await expect(dialog.alert).toHaveRole('alert');
    await expect(dialog.submit).toHaveText('Try again');
    await expect(dialog.reason('A scam')).toBeChecked();
    await expect(dialog.note).toHaveValue(NOTE);
    await expect(dialog.note).not.toHaveAttribute('readonly');
    expect(await dialog.holdsFocus()).toBe(true);

    const release = api.hold('POST', reportPath(hall().id));
    answerReporting(api, hall().id);
    await dialog.submit.click();
    await expect(dialog.alert).toHaveCount(0);
    await expect(dialog.submit).toHaveText('Send report');
    release();

    await expect(dialog.title).toHaveText('Thanks. Your report was sent.');
    expect(reportBodies(api, hall().id)).toEqual([
      { reason: 'scam', note: NOTE },
      { reason: 'scam', note: NOTE },
    ]);
  });

  // L2-021 criteria 3 and 8: the backend says there is an earlier report, and when.
  test('a second report says when the first was sent, and Report then says so at once', async ({
    page,
    api,
  }) => {
    refuseAsAlreadyReported(api, hall().id, REPORTED_AT);
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await dialog.reason('A scam').check();

    await dialog.submit.click();

    await expect(dialog.title).toHaveText(ALREADY);
    await expect(dialog.description).toHaveText(ALREADY_TEXT);
    await expect(dialog.status).toHaveText(`${ALREADY} ${ALREADY_TEXT}`);
    await expect(dialog.icon).toBeVisible();
    await expect(dialog.radios).toHaveCount(0);
    await expect(dialog.ok).toBeFocused();

    await dialog.ok.click();
    await expect(screen.report).toBeFocused();
    await screen.report.click();

    await expect(dialog.title).toHaveText(ALREADY);
    await expect(dialog.ok).toBeFocused();
    expect(reportBodies(api, hall().id)).toHaveLength(1);
  });

  // L2-021 criterion 8: a listing read as already reported sends nothing.
  test('a listing the member reported before says so as soon as Report is pressed', async ({
    page,
    api,
  }) => {
    answerListing(api, hall({ reportedAt: REPORTED_AT.toISOString() }));
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);

    await screen.report.click();

    await expect(dialog.root).toHaveAccessibleName(ALREADY);
    await expect(dialog.root).toHaveAccessibleDescription(ALREADY_TEXT);
    await expect(dialog.ok).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(screen.report).toBeFocused();
    expect(reportBodies(api, hall().id)).toEqual([]);
  });

  // L2-021 criterion 5: someone who is not a member joins first.
  test('someone who is not a member is asked to join, then reports the listing', async ({
    page,
    api,
  }) => {
    answerJoining(api);
    answerReporting(api, hall().id);
    const screen = new ListingPage(page);
    const join = new JoinDialogPart(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await expect(join.title).toHaveText('Become a member to report');
    await join.notNow.click();
    await expect(join.root).toHaveCount(0);
    await expect(screen.report).toBeFocused();

    await screen.report.click();
    await join.fill('Sarah Kim', 'Grace Community Church, Langley');
    await join.submit.click();

    await expect(dialog.title).toHaveText('Report this listing');
    await expect(dialog.reason('Not a real listing')).toBeFocused();
    await dialog.reason('Inappropriate').check();
    await dialog.submit.click();
    await expect(dialog.title).toHaveText('Thanks. Your report was sent.');
    await dialog.done.click();
    await expect(screen.report).toBeFocused();
  });

  // L2-021 criterion 12: taken down while the report was written.
  test('a listing taken down meanwhile closes the dialog and is said to be gone', async ({
    page,
    api,
  }) => {
    api.refuse('POST', reportPath(hall().id), 404, 'not_found');
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await dialog.reason('A scam').check();
    api.refuse('GET', listingPath(hall().id), 404, 'not_found');

    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(screen.heading).toHaveText('This listing isn’t here.');
  });

  // L2-021 criteria 10 and 11: the member's own listing, read again after a refusal.
  test('a listing that is the member’s own closes the dialog and offers no Report', async ({
    page,
    api,
  }) => {
    api.refuse('POST', reportPath(hall().id), 403, 'own_listing');
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await dialog.reason('A scam').check();
    answerListing(api, hall({ isOwn: true }));

    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(screen.heading).toHaveText(hall().title);
    await expect(screen.report).toHaveCount(0);
  });

  // L2-021 criterion 10.
  test('the member’s own listing offers no Report', async ({ page, api }) => {
    answerListing(api, hall({ isOwn: true }));
    const screen = new ListingPage(page);

    await screen.open(hall().id);

    await expect(screen.heading).toHaveText(hall().title);
    await expect(screen.report).toHaveCount(0);
  });
});
