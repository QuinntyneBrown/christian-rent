// Acceptance Test
// Traces to: L2-005, L2-009, L2-011, L2-012, L2-017, L2-032
// Description: A person who is not a member is asked to join when Post opens and before anything is sent, comes back to Post with their choices kept, and leaving Post while a listing is sent cancels the request.
import { answerJoining, answerMember } from '../../fixtures/members';
import { answerNoListings } from '../../fixtures/listings';
import { answerPosting } from '../../fixtures/post';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';
import { JoinDialogPart } from '../../pages/join-dialog.part';
import { PostPage } from '../../pages/post.page';

test.describe('Post: who may post', () => {
  // L2-005 criterion 3; L2-009 criterion 4; L2-011 criterion 4: a person who is not a member
  // opens Post from Browse, joins in the dialog over it, and is back on Post with "need" chosen,
  // their church and name in the preview.
  test('a person who is not a member joins over Post and keeps their choice', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    answerJoining(api);
    const browse = new BrowsePage(page);
    const post = new PostPage(page);
    const dialog = new JoinDialogPart(page);
    await browse.open();

    await browse.lookingForSomething.click();

    await expect(dialog.title).toHaveText('Become a member to post');
    // Behind the dialog Post is inert, so it is read by its text: "need" is chosen.
    await expect(post.sentence).toHaveText(/to rent\.\s*$/);
    await dialog.fill('Sarah Kim', 'Grace Community Church, Langley');
    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(post.need).toBeChecked();
    await expect(post.previewChurch).toHaveText('Grace Community Church');
    await expect(post.previewTitle).toHaveText('Sarah Kim');
  });

  // L2-011 criterion 6; L2-009 criterion 4; L2-025 criterion 3: a person who closes the
  // dialog stays on Post with what they typed, sees "Your church" and "Your name", and is asked
  // again before anything is sent.
  test('a person who is not a member stays on Post and is asked again before anything is sent', async ({
    page,
    api,
  }) => {
    answerJoining(api);
    const post = new PostPage(page);
    const dialog = new JoinDialogPart(page);
    await post.open('?offer=wanted');
    await expect(dialog.title).toHaveText('Become a member to post');

    await dialog.notNow.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(post.previewChurch).toHaveText('Your church');
    await expect(post.previewTitle).toHaveText('Your name');
    await post.title.fill('Folding chairs');
    await post.when.fill('Sat, Aug 8');
    await post.area.fill('Abbotsford');

    await post.submit.click();

    await expect(dialog.title).toHaveText('Become a member to post');
    await dialog.notNow.click();
    await expect(post.submit).toHaveText('Post request');
    await expect(post.submit).not.toHaveAttribute('aria-busy');
    await expect(post.title).toHaveValue('Folding chairs');
    expect(api.requests.filter((request) => request.startsWith('POST'))).toEqual([]);
  });

  // ADR 0019: leaving Post while a listing is sent cancels the request and keeps the draft.
  test('leaving Post while a listing is sent cancels the request and keeps the draft', async ({
    page,
    api,
  }) => {
    answerMember(api);
    answerPosting(api);
    answerNoListings(api);
    api.hold('POST', '/api/listings');
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();
    const failed = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/api/listings'),
    );
    await post.submit.click();
    await expect(post.submit).toHaveAttribute('aria-busy', 'true');

    await post.header.close.click();

    expect((await failed).failure()?.errorText).toBe('net::ERR_ABORTED');
    await expect(new BrowsePage(page).haveSomethingToRent.first()).toBeVisible();
    await post.open();
    await expect(post.title).toHaveValue('Pressure washer and drill kit');
  });
});
