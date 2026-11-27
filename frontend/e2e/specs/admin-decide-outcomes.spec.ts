import {
  ALICIA,
  LOCKER,
  PARTY_BUS,
  REVIEW_NOW,
  YARD,
  answerAdmin,
  answerDecisions,
  answerDetails,
  answerQueue,
  decisionPath,
  decisionsSent,
  refuseAsDecided,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';
import { ConfirmRemoveDialogPart } from '../pages/confirm-remove-dialog.part';
import { ReviewToastsPart } from '../pages/review-toasts.part';

/** A toast leaves after 8 s (L2-020, criterion 14; ADR 0025). */
const TOAST_MS = 8_000;

test.describe('What a decision says', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.install({ time: REVIEW_NOW });
    answerAdmin(api);
    answerQueue(api);
    answerDetails(api);
    answerDecisions(api);
  });

  // L2-020 criteria 11 and 14; L2-032 criterion 4: a toast names the decision and the item, is
  // announced, offers no undo, and leaves after 8 s unless the pointer is on it.
  test('names the decision in a toast that leaves after 8 s', async ({ page }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    await admin.open();

    await admin.approve.click();

    await expect(toasts.region).toHaveAttribute('role', 'status');
    await expect(toasts.titles).toHaveText(['Approved']);
    await expect(toasts.text('Approved')).toHaveText(
      '“Backyard garden for gatherings” is now public on Browse.',
    );
    await expect(toasts.toast('Approved').getByRole('button')).toHaveText(['']);
    await expect(toasts.dismiss('Approved')).toBeVisible();

    await toasts.toast('Approved').hover();
    await page.clock.runFor(TOAST_MS);
    await expect(toasts.toast('Approved')).toBeVisible();

    await admin.heading.hover();
    await page.clock.runFor(TOAST_MS);
    await expect(toasts.toasts).toHaveCount(0);
  });

  // ADR 0025: each decision has its own words; a removal confirmed in the dialog is named too.
  test('says what each decision did', async ({ page }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await admin.open(`?item=${PARTY_BUS.id}`);

    await admin.keep.click();
    await expect(admin.item(LOCKER.title)).toHaveAttribute('aria-current', 'true');
    await expect(toasts.titles).toHaveText(['Kept']);
    await admin.remove.click();
    await expect(toasts.titles).toHaveText(['Kept']);
    await dialog.confirm.click();

    await expect(toasts.titles).toHaveText(['Kept', 'Removed']);
    await expect(toasts.text('Kept')).toHaveText(
      '“Party bus, cheap, DM for details” stays public, and its report is closed.',
    );
    await expect(toasts.text('Removed')).toHaveText(
      '“Storage locker for our food bank” won’t be public, and Marcus Lee is told.',
    );
  });

  // L2-020 criterion 13; ADR 0025: another admin decided first. The item leaves the queue, the
  // panel keeps it with a warning and its decisions off, and a toast says so.
  test('says when another admin decided first', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    refuseAsDecided(api, YARD, 'approve', new Date(2026, 5, 8, 12, 14));
    await admin.open();

    await admin.remove.click();
    await new ConfirmRemoveDialogPart(page).confirm.click();

    await expect(admin.decidedTitle).toHaveText('This was already decided.');
    await expect(admin.decidedText).toHaveText(
      'Another admin approved it at 12:14 p.m. Your decision was not applied.',
    );
    await expect(admin.decidedNotice).toHaveAttribute('role', 'alert');
    await expect(admin.detailTitle).toHaveText('Backyard garden for gatherings');
    await expect(admin.approve).toBeDisabled();
    await expect(admin.remove).toBeDisabled();
    await expect(admin.item(YARD.title)).toHaveCount(0);
    await expect(admin.summary).toHaveText('3 waiting · oldest first');
    await expect(toasts.titles).toHaveText(['Already decided']);
    await expect(toasts.text('Already decided')).toHaveText(
      'Another admin approved “Backyard garden for gatherings” first. Your decision was not applied.',
    );

    await admin.goToNext.click();

    await expect(admin.item(ALICIA.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.detailTitle).toHaveText('Dr. Alicia Gomez');
    await expect(admin.detailTitle).toBeFocused();
    await expect(admin.decidedNotice).toHaveCount(0);
  });

  // L2-020 criteria 12 and 14: a decision not saved stays in the queue; its toast is announced
  // at once, never leaves by itself, and Try again repeats the same decision.
  test('keeps the item when a decision is not saved, and tries again', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    api.refuse('POST', decisionPath(YARD), 503, 'unavailable');
    await admin.open();

    await admin.approve.click();

    const failed = toasts.toast('Your decision wasn’t saved');
    await expect(failed).toHaveAttribute('role', 'alert');
    await expect(toasts.text('Your decision wasn’t saved')).toHaveText(
      'We couldn’t reach christian.rent. “Backyard garden for gatherings” is still in the queue.',
    );
    await page.clock.runFor(TOAST_MS * 2);
    await expect(failed).toBeVisible();
    await expect(admin.item(YARD.title)).toHaveAttribute('aria-current', 'true');

    api.answer('POST', decisionPath(YARD), { status: 204 });
    await toasts.action('Your decision wasn’t saved', 'Try again').click();

    await expect(toasts.titles).toHaveText(['Approved']);
    await expect(admin.item(YARD.title)).toHaveCount(0);
    expect(decisionsSent(api, YARD)).toEqual([{ decision: 'approve' }, { decision: 'approve' }]);
  });

  // ADR 0025: at most three toasts, newest at the bottom; a fourth drops the oldest.
  test('shows at most three toasts, newest last', async ({ page }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    await admin.open(`?item=${PARTY_BUS.id}`);

    await admin.keep.click();
    await expect(admin.item(LOCKER.title)).toHaveAttribute('aria-current', 'true');
    await admin.approve.click();
    await expect(admin.item(ALICIA.title)).toHaveAttribute('aria-current', 'true');
    await admin.approve.click();
    await expect(admin.item(YARD.title)).toHaveAttribute('aria-current', 'true');
    await admin.approve.click();

    await expect(toasts.texts()).toHaveText([
      '“Storage locker for our food bank” is now public on Browse.',
      'Dr. Alicia Gomez is now verified.',
      '“Backyard garden for gatherings” is now public on Browse.',
    ]);
  });
});
