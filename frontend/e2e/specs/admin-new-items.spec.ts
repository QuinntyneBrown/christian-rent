import {
  ALICIA,
  LOCKER,
  PARTY_BUS,
  QUEUE,
  REVIEW_NOW,
  answerAdmin,
  answerDecisions,
  answerDetails,
  answerQueue,
  manyItems,
  queueRequests,
} from '../fixtures/review';
import { expect, test } from '../fixtures/test';
import { AdminPage } from '../pages/admin.page';
import { ReviewToastsPart } from '../pages/review-toasts.part';

/** While Admin is visible the queue is asked again every 60 s (ADR 0025). */
const POLL_MS = 60_000;

test.describe('New items while the queue is open', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.install({ time: REVIEW_NOW });
    answerAdmin(api);
    answerQueue(api);
    answerDetails(api);
  });

  // L2-019 criterion 12: a notification says how many arrived and offers to show them.
  test('says how many new items arrived, and shows them', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    await admin.open();
    await expect(admin.items).toHaveCount(4);
    const arrived = [...QUEUE, ...manyItems(2)];
    answerQueue(api, arrived);
    answerDetails(api, arrived);

    await page.clock.runFor(POLL_MS);

    await expect(toasts.titles).toHaveText(['2 new items are waiting']);
    await expect(toasts.text('2 new items are waiting')).toHaveText(
      'They arrived while you were reviewing.',
    );
    await expect(admin.items).toHaveCount(4);

    await toasts.action('2 new items are waiting', 'Show them').click();

    await expect(admin.items).toHaveCount(6);
    await expect(admin.summary).toHaveText('6 waiting · oldest first');
    await expect(toasts.toasts).toHaveCount(0);
  });

  // ADR 0025: what the admin decided is not mistaken for what arrived.
  test('counts one arrival after a decision as one', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    answerDecisions(api);
    await admin.open();
    await admin.approve.click();
    await expect(admin.items).toHaveCount(3);
    const [, ...rest] = QUEUE;
    const arrived = [...rest, ...manyItems(1)];
    expect(rest).toEqual([ALICIA, PARTY_BUS, LOCKER]);
    answerQueue(api, arrived);
    answerDetails(api, arrived);

    await page.clock.runFor(POLL_MS);

    await expect(toasts.titles).toHaveText(['1 new item is waiting']);
  });

  // ADR 0025: the queue is asked again only every 60 s, and nothing new says nothing.
  test('says nothing when nothing new arrived', async ({ page, api }) => {
    const admin = new AdminPage(page);
    const toasts = new ReviewToastsPart(page);
    await admin.open();
    await expect(admin.items).toHaveCount(4);

    await page.clock.runFor(POLL_MS - 1_000);
    expect(queueRequests(api)).toHaveLength(1);
    await page.clock.runFor(1_000);

    await expect.poll(() => queueRequests(api)).toHaveLength(2);
    await expect(toasts.toasts).toHaveCount(0);
  });

  // ADR 0025: while the page is hidden nothing is asked.
  test('asks nothing while the page is hidden', async ({ page, api }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.items).toHaveCount(4);

    await admin.setHidden(true);
    await page.clock.runFor(POLL_MS * 3);
    expect(queueRequests(api)).toHaveLength(1);

    await admin.setHidden(false);
    await page.clock.runFor(POLL_MS);
    await expect.poll(() => queueRequests(api)).toHaveLength(2);
  });
});
