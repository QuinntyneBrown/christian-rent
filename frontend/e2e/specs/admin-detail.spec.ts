import {
  ALICIA,
  DETAILS,
  LOCKER,
  PARTY_BUS,
  REVIEW_NOW,
  YARD,
  answerAdmin,
  answerDetails,
  answerQueue,
  detailRequests,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';

test.describe('An item’s detail', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(REVIEW_NOW);
    answerAdmin(api);
    answerQueue(api);
    answerDetails(api);
  });

  // L2-019 criteria 2 and 7; ADR 0024: the oldest item opens first, with every field.
  test('opens the oldest item, a new listing, with all it says', async ({ page }) => {
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.item(YARD.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.detailTitle).toHaveText('Backyard garden for gatherings');
    await expect(admin.detailPrice).toHaveText('$150 / day');
    await expect(admin.detailTag).toHaveText('For rent · space');
    await expect(admin.detailPhoto).toHaveAttribute(
      'alt',
      'A long table set for dinner on a lawn under string lights',
    );
    await expect(admin.detailNote).toHaveText(/^Seats 30 at a long table/);
    await expect(admin.factNames()).toHaveText([
      'Posted by',
      'Church',
      'When',
      'Where',
      'Member since',
      'Posted',
    ]);
    await expect(admin.fact('Posted by')).toHaveText('The Okafor family Verified member');
    await expect(admin.fact('Church')).toHaveText('Redeemer Presbyterian Verified church');
    await expect(admin.fact('When')).toHaveText('Fridays and Saturdays');
    await expect(admin.fact('Where')).toHaveText('Brookswood, Langley');
    await expect(admin.fact('Member since')).toHaveText('Apr 2025');
    await expect(admin.fact('Posted')).toHaveText('Jun 8, 2026, 9:12 a.m.');
  });

  // L2-019 criterion 8: the reason, the note and when, but not who reported it.
  test('shows a report with its reason and a way to the listing', async ({ page }) => {
    const admin = new AdminPage(page);

    await admin.open(`?item=${PARTY_BUS.id}`);

    await expect(admin.item(PARTY_BUS.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.detailReport).toHaveText(
      'Reported as a scam by a member, 40 min ago: “Asking people to pay cash off the site. Doesn’t seem to belong to any church.”',
    );
    await expect(admin.detailTag).toHaveText('For rent · thing');
    await expect(admin.fact('Posted by')).toHaveText('Mike Rentals');
    await expect(admin.fact('Member since')).toHaveText('Jun 2026');
    await expect(admin.fact('Public since')).toHaveText('Jun 6, 2026');
    await expect(admin.fact('Posted')).toHaveCount(0);
    const listing = DETAILS[PARTY_BUS.id] as { listing: { id: string } };
    await expect(admin.viewOnSite).toHaveAttribute('href', `/listings/${listing.listing.id}`);
  });

  test('shows a wanted listing as its title on blue, with “Up to”', async ({ page }) => {
    const admin = new AdminPage(page);

    await admin.open(`?item=${LOCKER.id}`);

    await expect(admin.detailWanted).toHaveText('Storage locker for our food bank');
    await expect(admin.detailPrice).toHaveText('Up to $60 / month');
    await expect(admin.detailTag).toHaveText('Wanted · space');
    await expect(admin.fact('When')).toHaveText('From Jul 1, 2026');
    await expect(admin.fact('Church')).toHaveText('New Song Fellowship');
    await expect(admin.viewOnSite).toHaveCount(0);
  });

  // L2-019 criterion 9: a new member, their church and who entered it; the only controls are the
  // decisions (L2-020), none for the church.
  test('shows a new member, their church and what they have done', async ({ page }) => {
    const admin = new AdminPage(page);

    await admin.open(`?item=${ALICIA.id}`);

    await expect(admin.detailTitle).toHaveText('Dr. Alicia Gomez');
    await expect(admin.detailJoined).toHaveText('Joined Jun 8, 2026, 11:20 a.m.');
    await expect(admin.factNames()).toHaveText([
      'Name',
      'Church',
      'Declared',
      'Church status',
      'Listings',
      'Messages sent',
    ]);
    await expect(admin.fact('Church')).toHaveText('St. Paul’s Anglican, Fort Langley');
    await expect(admin.fact('Declared')).toHaveText('“I am a Christian”');
    await expect(admin.fact('Church status')).toHaveText(
      'New to christian.rent, entered by this member',
    );
    await expect(admin.fact('Listings')).toHaveText('1 wanted listing, public');
    await expect(admin.fact('Messages sent')).toHaveText('None');
    await expect(admin.decisions).toHaveText(['Approve', 'Remove']);
  });

  // ADR 0024: the selection is in the address, and a newer one aborts the request before it (L2-030).
  test('opens the item an admin selects, whatever answered before', async ({ page, api }) => {
    const release = api.hold('GET', `/api/review-queue/${YARD.id}`);
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.detailSkeleton.first()).toBeVisible();
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith(`/api/review-queue/${YARD.id}`),
    );

    await admin.item(LOCKER.title).click();
    await expect(admin.detailTitle).toHaveText(LOCKER.title);
    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
    release();

    await expect(page).toHaveURL(`/admin?item=${LOCKER.id}`);
    await expect(admin.item(LOCKER.title)).toHaveAttribute('aria-current', 'true');
    await expect(admin.item(YARD.title)).toHaveAttribute('aria-current', 'false');
    await expect(admin.detailTitle).toHaveText(LOCKER.title);
  });

  // L2-033 criterion 2.
  test('says when the detail did not load, and tries again', async ({ page, api }) => {
    api.refuse('GET', `/api/review-queue/${YARD.id}`, 503, 'unexpected');
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.detailFailed).toContainText('We couldn’t load this item.');

    answerDetails(api);
    await admin.detail.getByRole('button', { name: 'Try again' }).click();

    await expect(admin.detailTitle).toHaveText(YARD.title);
  });

  // L2-019 criterion 6 (gone) and L2-033: an item decided or removed meanwhile.
  test('says when an item is no longer waiting', async ({ page, api }) => {
    api.refuse('GET', `/api/review-queue/${YARD.id}`, 404, 'not_found');
    const admin = new AdminPage(page);

    await admin.open();

    await expect(admin.detail).toContainText('This item is no longer waiting.');
  });

  // L2-031 criteria 5 and 7: a phone shows the queue only and asks for no detail.
  test('asks for no detail on a phone', async ({ page, api }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const admin = new AdminPage(page);

    await admin.open();
    await expect(admin.items).toHaveCount(4);

    await expect(admin.detail).toBeHidden();
    expect(detailRequests(api)).toEqual([]);
  });
});
