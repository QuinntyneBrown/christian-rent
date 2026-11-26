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
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';
import { ConfirmRemoveDialogPart } from '../pages/confirm-remove-dialog.part';

test.describe('Deciding an item', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
    answerQueue(api);
    answerDetails(api);
    answerDecisions(api);
  });

  // L2-020 criteria 1, 3 and 11: Approve records the decision; the item leaves the queue, the
  // count drops and the next item opens.
  test('approves a new listing; it leaves the queue and the next opens @critical', async ({
    page,
    api,
  }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.decisions).toHaveText(['Approve', 'Remove']);

    await admin.approve.click();

    await expect(admin.item(YARD.title)).toHaveCount(0);
    await expect(admin.item(ALICIA.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.detailJoined).toBeVisible();
    await expect(admin.summary).toHaveText('3 waiting · oldest first');
    await expect(admin.reviewCount).toHaveText('3');
    expect(decisionsSent(api, YARD)).toEqual([{ decision: 'approve' }]);
  });

  // L2-020 criteria 2 and 8; L2-032 criterion 9: a report offers Keep listing and Remove; Keep
  // needs no confirmation, and focus moves to the item that opens next.
  test('keeps a reported listing', async ({ page, api }) => {
    const admin = new AdminPage(page);
    await admin.open(`?item=${PARTY_BUS.id}`);
    await expect(admin.decisions).toHaveText(['Keep listing', 'Remove']);

    await admin.keep.click();

    await expect(admin.item(PARTY_BUS.title)).toHaveCount(0);
    await expect(admin.item(LOCKER.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.detailTitle).toHaveText('Storage locker for our food bank');
    await expect(admin.detailTitle).toBeFocused();
    expect(decisionsSent(api, PARTY_BUS)).toEqual([{ decision: 'keep' }]);
  });

  // L2-020 criteria 4 and 9; L2-032 criterion 9: Remove asks first, naming what is removed and
  // what follows, with focus on "Keep it"; keeping it sends nothing and returns focus.
  test('asks before removing a reported listing, with focus on Keep it', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await admin.open(`?item=${PARTY_BUS.id}`);

    await admin.remove.click();

    await expect(dialog.title).toHaveText('Remove “Party bus, cheap, DM for details”?');
    await expect(dialog.description).toHaveText(
      'The listing stops being public, every open report on it is closed, and Mike Rentals is ' +
        'told it was removed. Your name and the time are recorded.',
    );
    await expect(dialog.confirm).toHaveText('Remove listing');
    await expect(dialog.keepIt).toBeFocused();
    await expect(dialog.root).toHaveAccessibleName('Remove “Party bus, cheap, DM for details”?');

    await dialog.keepIt.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.remove).toBeFocused();
    await expect(admin.item(PARTY_BUS.title)).toHaveCount(1);
    expect(decisionsSent(api, PARTY_BUS)).toEqual([]);
  });

  // L2-020 criteria 4, 9 and 10: removing a new listing says it never becomes public; while it
  // is sent nothing else can be done; then the item leaves the queue.
  test('removes a new listing once confirmed', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await admin.open();
    await admin.remove.click();
    await expect(dialog.title).toHaveText('Remove “Backyard garden for gatherings”?');
    await expect(dialog.description).toHaveText(
      'It never becomes public, and The Okafor family is told it was removed. Your name and the ' +
        'time are recorded.',
    );
    const release = api.hold('POST', decisionPath(YARD));

    await dialog.confirm.click();

    await expect(dialog.confirm).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.keepIt).toHaveAttribute('aria-disabled', 'true');
    release();
    await expect(dialog.root).toHaveCount(0);
    await expect(admin.item(YARD.title)).toHaveCount(0);
    await expect(admin.item(ALICIA.title)).toHaveAttribute('aria-current', 'true');
    expect(decisionsSent(api, YARD)).toEqual([{ decision: 'remove' }]);
  });

  // L2-020 criteria 3 and 4: removing a new member names them and what follows.
  test('asks before removing a new member', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    await admin.open(`?item=${ALICIA.id}`);

    await admin.remove.click();

    await expect(dialog.title).toHaveText('Remove Dr. Alicia Gomez?');
    await expect(dialog.description).toHaveText(
      'They can no longer sign in, post or message, and their listings stop being public. Your ' +
        'name and the time are recorded.',
    );
    await dialog.confirm.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(admin.item(ALICIA.title)).toHaveCount(0);
    expect(decisionsSent(api, ALICIA)).toEqual([{ decision: 'remove' }]);
  });

  // L2-020 criterion 10: a removal that fails says nothing has changed; Try again repeats it.
  test('says nothing changed when a removal fails, and tries again', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const dialog = new ConfirmRemoveDialogPart(page);
    api.refuse('POST', decisionPath(YARD), 503, 'unavailable');
    await admin.open();
    await admin.remove.click();

    await dialog.confirm.click();

    await expect(dialog.alertTitle).toHaveText('The listing wasn’t removed.');
    await expect(dialog.alertText).toHaveText(
      'We couldn’t reach christian.rent. Nothing has changed.',
    );
    await expect(dialog.confirm).toHaveText('Try again');
    await expect(admin.item(YARD.title)).toHaveCount(1);

    api.answer('POST', decisionPath(YARD), { status: 204 });
    await dialog.confirm.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(admin.item(YARD.title)).toHaveCount(0);
    expect(decisionsSent(api, YARD)).toEqual([{ decision: 'remove' }, { decision: 'remove' }]);
  });
});
