// Acceptance Test
// Traces to: L2-012, L2-022, L2-027, L2-032, L2-033
// Description: A failed post keeps everything and offers "Try again", which repeats the same request; the posting limit says when posting reopens, keeps everything and turns the button off.
import { answerMember } from '../../fixtures/members';
import { POSTED_ID } from '../../fixtures/post';
import { expect, test } from '../../fixtures/test';
import { PostPage } from '../../pages/post.page';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('Post: a post that is refused', () => {
  test.beforeEach(({ api }) => answerMember(api));

  // L2-012 criteria 4 and 5; L2-033 criterion 2; L2-032 criterion 4: a failure is announced
  // plainly, nothing entered is lost, and "Try again" sends the same request again.
  test('keeps everything after a failure, and "Try again" sends the same request', async ({
    page,
    api,
  }) => {
    let attempts = 0;
    api.answer('POST', '/api/listings', () =>
      ++attempts === 1
        ? { status: 503, body: '' }
        : { status: 201, body: { id: POSTED_ID, status: 'waiting-for-review' } },
    );
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();

    await post.submit.click();

    await expect(post.alert).toHaveAttribute('role', 'alert');
    await expect(post.alert.locator('.alert__title')).toHaveText('Your listing wasn’t posted.');
    await expect(post.alert.locator('.alert__text')).toHaveText(
      'We couldn’t reach christian.rent. Everything you entered is still here.',
    );
    await expect(post.submit).toHaveText('Try again');
    await expect(post.title).toHaveValue('Pressure washer and drill kit');
    await expect(post.note).toHaveValue('Pick up from my garage. Happy to show you how it works.');
    await expect(post.previewTitle).toHaveText('Pressure washer and drill kit');

    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    const [first, second] = api.bodies.get('POST /api/listings') as { clientRequestId: string }[];
    expect(second!.clientRequestId).toBe(first!.clientRequestId);
  });

  // L2-027 criterion 3; ADR 0019: the general write limit is shown as a failure.
  test('shows the write limit as a failure to try again', async ({ page, api }) => {
    api.refuse('POST', '/api/listings', 429, 'rate_limited');
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();

    await post.submit.click();

    await expect(post.alert.locator('.alert__title')).toHaveText('Your listing wasn’t posted.');
    await expect(post.submit).toHaveText('Try again');
    await expect(post.submit).toBeEnabled();
  });

  // L2-012 criteria 6 and 10; L2-022 criterion 8: the eleventh listing in 24 hours is refused
  // with when posting reopens, everything is kept and the button is off.
  test('says when posting reopens after the limit of 10, and turns the button off', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(new Date('2026-06-08T15:00:00-07:00'));
    api.answer('POST', '/api/listings', {
      status: 429,
      body: {
        type: 'about:blank',
        title: 'Limit reached',
        status: 429,
        code: 'post_limit_reached',
        retryAt: '2026-06-09T16:15:00+00:00',
      },
      headers: { 'content-type': 'application/problem+json' },
    });
    const post = new PostPage(page);
    await post.open('?offer=wanted');
    await post.title.fill('Folding chairs');
    await post.when.fill('Sat, Aug 8');
    await post.area.fill('Abbotsford');

    await post.submit.click();

    await expect(post.alert).toHaveClass(/alert--warning/);
    await expect(post.alert).toHaveAttribute('role', 'alert');
    await expect(post.alert.locator('.alert__title')).toHaveText(
      'You’ve posted 10 listings in the last 24 hours.',
    );
    await expect(post.alert.locator('.alert__text')).toHaveText(
      'You can post again tomorrow at 9:15 a.m. Everything you entered is still here.',
    );
    await expect(post.submit).toBeDisabled();
    await expect(post.submit).toHaveText('Post request');
    await expect(post.title).toHaveValue('Folding chairs');
  });
});
