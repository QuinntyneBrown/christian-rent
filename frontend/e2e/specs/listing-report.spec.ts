// Acceptance Test
// Traces to: L2-021, L2-031, L2-032
// Description: A member reports a listing from the Listing screen: a reason and an optional note, then an announced confirmation; the dialog says what happens, asks for a reason, shows that it is busy, holds focus and returns it to Report.
import { answerListing, hall } from '../fixtures/listing';
import { answerListings, answerPhotos, forRent } from '../fixtures/listings';
import { answerMember } from '../fixtures/members';
import { answerReporting, reportBodies, reportPath } from '../fixtures/reports';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';
import { ListingPage } from '../pages/listing.page';
import { ReportDialogPart } from '../pages/report-dialog.part';

const NOTE = 'It asks people to pay a deposit before they have seen the hall.';
const REASONS = ['Not a real listing', 'Inappropriate', 'A scam', 'Something else'];

test.describe('Listing: report a listing', () => {
  test.beforeEach(async ({ api }) => {
    answerMember(api);
    answerListing(api, hall());
  });

  // L2-021 criteria 1, 2 and 6; L2-032 criteria 4 and 9.
  test('a member reports a listing and sees it confirmed @critical', async ({ page, api }) => {
    answerReporting(api, hall().id);
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);

    await screen.report.click();

    await expect(dialog.title).toHaveText('Report this listing');
    await expect(dialog.root).toHaveAccessibleName('Report this listing');
    await expect(dialog.root).toHaveAccessibleDescription(
      'An admin will look at it. Dan is never told who reported.',
    );
    await expect(dialog.options).toHaveText(REASONS);
    for (const reason of REASONS) {
      await expect(dialog.reason(reason)).not.toBeChecked();
    }
    await expect(dialog.reason('Not a real listing')).toBeFocused();
    await expect(dialog.counter).toHaveText('0 / 500');
    await expect(dialog.note).toHaveAttribute('maxlength', '500');

    await dialog.reason('A scam').check();
    await dialog.note.fill(NOTE);
    await expect(dialog.counter).toHaveText('63 / 500');
    await dialog.submit.click();

    await expect(dialog.title).toHaveText('Thanks. Your report was sent.');
    await expect(dialog.description).toHaveText(
      'An admin will look at this listing. You don’t need to do anything else.',
    );
    await expect(dialog.status).toHaveText(
      'Thanks. Your report was sent. An admin will look at this listing. You don’t need to do anything else.',
    );
    await expect(dialog.icon).toBeVisible();
    await expect(dialog.radios).toHaveCount(0);
    await expect(dialog.done).toBeFocused();
    expect(reportBodies(api, hall().id)).toEqual([{ reason: 'scam', note: NOTE }]);

    await dialog.done.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(screen.report).toBeFocused();
  });

  // L2-021 criterion 7; L2-032 criteria 3, 4 and 5.
  test('a report with no reason is not sent, and the reasons say to choose one', async ({
    page,
    api,
  }) => {
    answerReporting(api, hall().id);
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();

    await dialog.submit.click();

    await expect(dialog.reasonError).toHaveText('Choose a reason.');
    await expect(dialog.reasonError).toHaveRole('alert');
    await expect(dialog.reasons).toHaveAccessibleDescription('Choose a reason.');
    for (const reason of REASONS) {
      await expect(dialog.reason(reason)).toHaveAttribute('aria-invalid', 'true');
    }
    await expect(dialog.reason('Not a real listing')).toBeFocused();
    expect(reportBodies(api, hall().id)).toEqual([]);

    await dialog.reason('Something else').check();

    await expect(dialog.reasonError).toHaveCount(0);
    await expect(dialog.reason('Something else')).not.toHaveAttribute('aria-invalid');
    await dialog.submit.click();
    await expect(dialog.title).toHaveText('Thanks. Your report was sent.');
    expect(reportBodies(api, hall().id)).toEqual([{ reason: 'other', note: null }]);
  });

  // L2-021 criterion 9.
  test('while a report is sent, nothing can be changed, closed or sent again', async ({
    page,
    api,
  }) => {
    answerReporting(api, hall().id);
    const release = api.hold('POST', reportPath(hall().id));
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.click();
    await dialog.reason('A scam').check();
    await dialog.note.fill(NOTE);

    await dialog.submit.click();

    await expect(dialog.submit).toHaveAttribute('aria-busy', 'true');
    for (const reason of REASONS) {
      await expect(dialog.reason(reason)).toBeDisabled();
    }
    await expect(dialog.note).toHaveAttribute('readonly');
    await expect(dialog.cancel).toHaveAttribute('aria-disabled', 'true');
    await expect(dialog.close).toHaveAttribute('aria-disabled', 'true');
    await dialog.submit.dispatchEvent('click');
    await dialog.cancel.dispatchEvent('click');
    await dialog.close.dispatchEvent('click');
    await page.keyboard.press('Escape');
    await expect(dialog.title).toHaveText('Report this listing');
    expect(await dialog.holdsFocus()).toBe(true);

    release();

    await expect(dialog.title).toHaveText('Thanks. Your report was sent.');
    expect(reportBodies(api, hall().id)).toHaveLength(1);
  });

  // L2-032 criteria 2 and 9: by keyboard alone, focus stays inside, and Escape, Close and
  // Cancel return it to Report; nothing typed is kept once the dialog closes (ADR 0023).
  test('the dialog is used by keyboard, holds focus and returns it to Report', async ({
    page,
    api,
  }) => {
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);
    await screen.report.focus();

    await page.keyboard.press('Enter');
    await expect(dialog.reason('Not a real listing')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dialog.reason('Inappropriate')).toBeChecked();
    for (let presses = 0; presses < 8; presses++) {
      await page.keyboard.press('Tab');
      expect(await dialog.holdsFocus()).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog.root).toHaveCount(0);
    await expect(screen.report).toBeFocused();

    await screen.report.click();
    await expect(dialog.reason('Inappropriate')).not.toBeChecked();
    await dialog.close.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(screen.report).toBeFocused();

    await screen.report.click();
    await dialog.cancel.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(screen.report).toBeFocused();
    expect(reportBodies(api, hall().id)).toEqual([]);
  });

  // L2-031: it works by touch on a narrow phone, as a bottom sheet with targets of 44 px.
  test('on a phone the dialog is a bottom sheet with targets of at least 44 px', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 640 });
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    await screen.open(hall().id);

    await screen.report.click();

    await expect(dialog.reason('Not a real listing')).toBeFocused();
    for (const height of await dialog.targetHeights()) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
    const sheet = (await dialog.panel.boundingBox())!;
    expect(Math.round(sheet.x)).toBe(0);
    expect(Math.round(sheet.width)).toBe(320);
    expect(Math.round(sheet.y + sheet.height)).toBe(640);
    expect(await screen.scrollsSideways()).toBe(false);
  });

  // L2-021 with the app's memory rules: leaving the screen closes the dialog and aborts the
  // report in flight.
  test('leaving the screen closes the dialog and aborts the report in flight', async ({
    page,
    api,
  }) => {
    answerListings(api, [forRent(hall().title, { id: hall().id })]);
    answerPhotos(api);
    api.hold('POST', reportPath(hall().id));
    const screen = new ListingPage(page);
    const dialog = new ReportDialogPart(page);
    const browse = new BrowsePage(page);
    await browse.open();
    await browse.cards.first().click();
    await screen.report.click();
    await dialog.reason('A scam').check();
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith(reportPath(hall().id)),
    );
    await dialog.submit.click();

    await page.goBack();

    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
    await expect(dialog.root).toHaveCount(0);
  });
});
