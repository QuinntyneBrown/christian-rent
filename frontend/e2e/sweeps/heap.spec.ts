import type { Page } from '@playwright/test';
import { answerListing, hall } from '../fixtures/listing';
import {
  answerListings,
  answerNoListings,
  answerPhotos,
  cast,
  many,
  page as listingsPage,
} from '../fixtures/listings';
import { answerJoining, answerMember } from '../fixtures/members';
import { refuseSendingAtLimit } from '../fixtures/messages';
import { answerReporting } from '../fixtures/reports';
import {
  GARDEN_ROW,
  MEMBER_ROW,
  LOCKER_LISTING,
  ALICIA_CHURCH,
  answerAdmin,
  answerChurchConfirmation,
  churchVerification,
  answerDecision,
  detailOf,
  manyRows,
  queuePage,
} from '../fixtures/review';
import { AdminPage } from '../pages/admin.page';
import { ConfirmRemoveDialogPart } from '../pages/confirm-remove-dialog.part';
import { answerUploads, photoFile } from '../fixtures/photos';
import { ListingPage } from '../pages/listing.page';
import { PostPage } from '../pages/post.page';
import { ReportDialogPart } from '../pages/report-dialog.part';
import { expect, test } from '../fixtures/test';

// AGENTS.md, Prove it: leaving a screen returns its memory. Enter and leave a screen many times
// and compare the heap after garbage collection. Run only when a person asks. Journeys that
// allocate heavily (Browse's list, the photo upload) add their screens here.
const ROUNDS = 20;
const ALLOWED_GROWTH_BYTES = 1_000_000;

async function heapMeter(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  return async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    return usedSize;
  };
}

async function leaveForNotFound(page: Page) {
  await page.evaluate(() => history.pushState({}, '', '/no-such-page'));
  await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
}

test('moving between Browse and "not found" keeps the heap stable', async ({ page, api }) => {
  answerNoListings(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const goToBrowse = page.getByRole('link', { name: 'Go to Browse' });
  const home = page.getByRole('heading', { level: 1 });

  const roundTrip = async () => {
    await leaveForNotFound(page);
    await goToBrowse.click();
    await expect(home).toBeFocused();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// L2-030 criterion 4: scrolling 120 listings and leaving, again and again, keeps the heap bounded.
test('scrolling Browse’s list and leaving it keeps the heap stable', async ({ page, api }) => {
  const pages = [0, 1, 2, 3, 4].map((index) =>
    listingsPage(many(24, index * 24 + 1), index < 4 ? `p${index + 2}` : null),
  );
  api.answer('GET', '/api/listings', (url) => {
    const cursor = url.searchParams.get('cursor');
    return { body: pages[cursor === null ? 0 : Number(cursor.slice(1)) - 1] };
  });
  answerPhotos(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const goToBrowse = page.getByRole('link', { name: 'Go to Browse' });
  const last = page.getByRole('heading', { level: 2, name: 'Listing 120', exact: true });

  const roundTrip = async () => {
    await expect(page.locator('a.listing-card').first()).toBeVisible();
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(last).toBeAttached({ timeout: 500 });
    }).toPass();
    expect(await page.locator('a.listing-card').count()).toBeLessThanOrEqual(72);
    await leaveForNotFound(page);
    await goToBrowse.click();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < 5; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// L2-003 with AGENTS.md, Bound what grows: searching, switching and clearing again and again
// keeps the heap bounded; each new query releases the list, the request and the timer before it.
test('searching and switching Browse again and again keeps the heap stable', async ({
  page,
  api,
}) => {
  answerListings(api, cast());
  answerPhotos(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const field = page.getByRole('searchbox', { name: 'Search listings', exact: true });
  const cards = page.locator('a.listing-card');
  const wantedOption = page.getByRole('link', { name: /^Wanted/ });
  const everything = page.getByRole('link', { name: /^Everything/ });

  const roundTrip = async () => {
    await field.fill('langley');
    await field.press('Enter');
    await expect(cards).toHaveCount(5);
    await wantedOption.click();
    await expect(cards).toHaveCount(2);
    await field.press('Escape');
    await everything.click();
    await expect(cards).toHaveCount(7);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// Lazy loading and memory: writing a message, meeting the limit (which starts the composer's
// timer) and leaving the listing, again and again, returns the composer, its request and its timer.
test('writing a message at the limit and leaving the listing keeps the heap stable', async ({
  page,
  api,
}) => {
  answerNoListings(api);
  answerMember(api);
  answerListing(api, hall());
  refuseSendingAtLimit(api, hall().id, new Date(Date.now() + 30 * 60 * 1000));
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const screen = new ListingPage(page);

  const roundTrip = async () => {
    await page.evaluate((id) => history.pushState({}, '', `/listings/${id}`), hall().id);
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await screen.message.text.fill('Is the hall free? '.repeat(50));
    await screen.message.submit.click();
    await expect(screen.message.submit).toBeDisabled();
    await screen.allListings.click();
    await expect(screen.heading).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// Lazy loading and memory: opening a listing with its photos and leaving it, again and again,
// returns the Listing screen's memory.
test('opening a listing and leaving it keeps the heap stable', async ({ page, api }) => {
  answerNoListings(api);
  answerListing(api, hall());
  const heapAfterGc = await heapMeter(page);
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1, name: 'Sunlit fellowship hall for 80' });
  const allListings = page.getByRole('link', { name: 'All listings', exact: true });

  const roundTrip = async () => {
    await page.evaluate((id) => history.pushState({}, '', `/listings/${id}`), hall().id);
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await expect(heading).toBeVisible();
    await page.getByRole('button', { name: 'Photo 3 of 3', exact: true }).click();
    await allListings.click();
    await expect(heading).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

test('opening the join dialog and closing it keeps the heap stable', async ({ page, api }) => {
  answerJoining(api);
  const heapAfterGc = await heapMeter(page);
  await page.goto('/dev/member-gate');
  const dialog = page.getByRole('dialog');

  const roundTrip = async () => {
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await page.getByLabel('Your church').selectOption({ label: 'My church isn’t listed' });
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(dialog).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

test('opening the report dialog and closing it keeps the heap stable', async ({ page, api }) => {
  answerMember(api);
  answerListing(api, hall());
  answerReporting(api, hall().id);
  const heapAfterGc = await heapMeter(page);
  const screen = new ListingPage(page);
  const dialog = new ReportDialogPart(page);
  await screen.open(hall().id);

  const roundTrip = async () => {
    await screen.report.click();
    await dialog.reason('A scam').check();
    await dialog.note.fill('a'.repeat(500));
    await dialog.cancel.click();
    await expect(dialog.root).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

test('writing a listing on Post and leaving it keeps the heap stable', async ({ page, api }) => {
  answerMember(api);
  const heapAfterGc = await heapMeter(page);
  const post = new PostPage(page);
  await page.goto('/no-such-page');

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/post'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await post.fillForRent();
    await post.giveDates.click();
    await post.submit.click();
    await post.summary.waitFor();
    await leaveForNotFound(page);
    await expect(post.form).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// The photo upload (ADR 0021): adding a photo, removing it, and leaving Post while another
// uploads, again and again, releases every object URL, upload and thumbnail.
test('adding and removing photos on Post and leaving it keeps the heap stable', async ({
  page,
  api,
}) => {
  answerMember(api);
  answerUploads(api);
  const heapAfterGc = await heapMeter(page);
  const post = new PostPage(page);
  await page.goto('/no-such-page');

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/post'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await post.choosePhoto(photoFile('trailer.jpg'));
    await post.removePhoto(1).click();
    await expect(post.photoItems).toHaveCount(0);
    const release = api.hold('POST', '/api/photos');
    await post.choosePhoto(photoFile('trailer.jpg'));
    await post.uploading(1).waitFor();
    await leaveForNotFound(page);
    await expect(post.form).toHaveCount(0);
    release();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// decide-review-item design: deciding an item, opening the confirmation and leaving Admin, again
// and again, releases the notifications and their timers, the look for new items and the dialog.
test('deciding on Admin and leaving it keeps the heap stable', async ({ page, api }) => {
  answerAdmin(api);
  answerDecision(api, GARDEN_ROW.id);
  const heapAfterGc = await heapMeter(page);
  const admin = new AdminPage(page);
  const dialog = new ConfirmRemoveDialogPart(page);
  await page.goto('/no-such-page');

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/admin'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await admin.approve.click();
    await expect(admin.toasts).toHaveCount(1);
    await admin.remove.click();
    await dialog.keepIt.click();
    await leaveForNotFound(page);
    await expect(admin.rows).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// verify-members-and-churches design: confirming a church and leaving Admin while it is in
// flight, again and again, releases the request, the notification and its timer.
test('confirming a church and leaving Admin keeps the heap stable', async ({ page, api }) => {
  answerAdmin(api);
  answerChurchConfirmation(api);
  const heapAfterGc = await heapMeter(page);
  const admin = new AdminPage(page);
  await page.goto('/no-such-page');

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/admin'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await admin.select(MEMBER_ROW.title);
    await admin.confirmChurch.click();
    await expect(admin.toasts).toHaveCount(1);
    // Choosing another item and coming back reads the church again, so it can be confirmed.
    await admin.select(GARDEN_ROW.title);
    await expect(admin.detailTitle).toHaveText(GARDEN_ROW.title);
    await admin.select(MEMBER_ROW.title);
    const release = api.hold('POST', churchVerification(ALICIA_CHURCH));
    await admin.confirmChurch.click();
    await leaveForNotFound(page);
    await expect(admin.rows).toHaveCount(0);
    release();
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});

// L2-019 criterion 19: scrolling a long queue to its end and leaving Admin, again and again,
// releases the rows, the detail, the observer and the media listener.
test('scrolling Admin’s queue and leaving it keeps the heap stable', async ({ page, api }) => {
  const rows = manyRows(200);
  answerAdmin(api);
  api.answer('GET', '/api/review-queue', (url) => {
    const start = Number(url.searchParams.get('cursor') ?? 0);
    const next = start + 50 < rows.length ? String(start + 50) : null;
    return { body: queuePage(rows.slice(start, start + 50), next, rows.length) };
  });
  api.answer('GET', `/api/review-queue/${rows[0]!.id}`, {
    body: detailOf(rows[0]!, { listing: LOCKER_LISTING }),
  });
  const heapAfterGc = await heapMeter(page);
  const admin = new AdminPage(page);
  await page.goto('/no-such-page');

  const roundTrip = async () => {
    await page.evaluate(() => history.pushState({}, '', '/admin'));
    await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate')));
    await expect(admin.rows.first()).toBeVisible();
    for (const last of [rows[99]!, rows[149]!, rows[199]!]) {
      await admin.scrollToEnd();
      await expect(admin.rowTitles.last()).toHaveText(last.title);
    }
    await leaveForNotFound(page);
    await expect(admin.rows).toHaveCount(0);
  };

  await roundTrip();
  const before = await heapAfterGc();
  for (let round = 0; round < ROUNDS; round++) {
    await roundTrip();
  }
  const after = await heapAfterGc();

  expect(after - before).toBeLessThan(ALLOWED_GROWTH_BYTES);
});
