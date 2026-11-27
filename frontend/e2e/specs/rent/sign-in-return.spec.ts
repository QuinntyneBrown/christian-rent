// Acceptance Test
// Traces to: L2-009, L2-015, L2-021, L2-037, L2-040
// Description: Someone not signed in who opens Post, sends a message or reports is taken to the sign-in page and returns where they were, with what they wrote kept; a session that ends on a screen leads to the sign-in page and back.
import { answerListing, hall } from '../../fixtures/listing';
import { SARAH_KIM, answerMember } from '../../fixtures/members';
import { answerSending, sentBodies } from '../../fixtures/messages';
import { answerReporting } from '../../fixtures/reports';
import { CREDENTIALS, answerSigningIn } from '../../fixtures/session';
import { expect, test } from '../../fixtures/test';
import { ListingPage } from '../../pages/listing.page';
import { PostPage } from '../../pages/post.page';
import { ReportDialogPart } from '../../pages/report-dialog.part';
import { SignInPage } from '../../pages/sign-in.page';

const TEXT = 'Hi Dan, is the hall free on the 13th?';

test.describe('Back where one was after signing in', () => {
  // L2-009 criterion 4; L2-037 criterion 5: Post with its choices kept.
  test('Post sends someone not signed in to sign in, and back to Post with their choices', async ({
    page,
    api,
  }) => {
    answerSigningIn(api, SARAH_KIM);
    const post = new PostPage(page);
    const signIn = new SignInPage(page);

    await post.open('?offer=wanted');
    await expect(signIn.heading).toHaveText('Sign in');
    expect(new URL(page.url()).searchParams.get('return')).toBe('/post?offer=wanted');
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(page).toHaveURL('/post?offer=wanted');
    await expect(post.need).toBeChecked();
    await expect(post.previewChurch).toHaveText(SARAH_KIM.churchName);
  });

  // L2-015 criterion 5: the message and its dates are kept, and sent once signed in.
  test('a message sends someone not signed in to sign in, and back with it kept', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSigningIn(api, SARAH_KIM);
    answerSending(api, listing.id);
    const screen = new ListingPage(page);
    const box = screen.message;
    const signIn = new SignInPage(page);
    await page.clock.setFixedTime(new Date('2026-06-08T12:00:00-07:00'));
    await screen.open(listing.id);
    await box.from.fill('2026-06-13');
    await box.to.fill('2026-06-14');
    await box.text.fill(TEXT);

    await box.submit.click();
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(page).toHaveURL(`/listings/${listing.id}`);
    await expect(box.text).toHaveValue(TEXT);
    await expect(box.from).toHaveValue('2026-06-13');
    expect(sentBodies(api, listing.id)).toEqual([]);
    await box.submit.click();
    await expect(box.sentTitle).toHaveText('Sent to Dan');
  });

  // L2-021 criterion 5.
  test('Report sends someone not signed in to sign in, and back to the listing', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSigningIn(api, SARAH_KIM);
    answerReporting(api, listing.id);
    const screen = new ListingPage(page);
    const signIn = new SignInPage(page);
    await screen.open(listing.id);

    await screen.report.click();
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(page).toHaveURL(`/listings/${listing.id}`);
    await screen.report.click();
    await expect(new ReportDialogPart(page).title).toBeVisible();
  });

  // L2-040 criterion 2: a session that ends while Post is open.
  test('a session that ended while posting leads to sign in, and back to Post with the draft', async ({
    page,
    api,
  }) => {
    answerMember(api);
    const post = new PostPage(page);
    const signIn = new SignInPage(page);
    await post.open('?offer=wanted');
    await post.title.fill('Folding chairs');
    await post.when.fill('Sat, Aug 8');
    await post.area.fill('Abbotsford');
    api.refuse('POST', '/api/listings', 401, 'not_signed_in');
    answerSigningIn(api, SARAH_KIM);

    await post.submit.click();

    await expect(signIn.alertTitle).toHaveText('Your session ended.');
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);
    await expect(page).toHaveURL('/post?offer=wanted');
    await expect(post.title).toHaveValue('Folding chairs');
  });
});
