// Acceptance Test
// Traces to: L2-036, L2-037, L2-040, L2-032
// Description: A member signs in on rent's own sign-in page and returns to where they were; every refusal reads alike; the page works by keyboard and with a password manager, and follows only a return address within rent.
import { answerListing, hall } from '../../fixtures/listing';
import { answerNoListings } from '../../fixtures/listings';
import { SARAH_KIM, answerMember } from '../../fixtures/members';
import { CREDENTIALS, answerSigningIn } from '../../fixtures/session';
import { expect, test } from '../../fixtures/test';
import { BrowsePage } from '../../pages/browse.page';
import { ListingPage } from '../../pages/listing.page';
import { SignInPage } from '../../pages/sign-in.page';

test.use({ timezoneId: 'America/Vancouver' });

test.describe('Signing in to christian.rent', () => {
  // L2-037 criteria 1 and 5; L2-036 criterion 1: from a listing, through the header, and back.
  test('signs in from the header and comes back to the listing as the member @critical', async ({
    page,
    api,
  }) => {
    const listing = hall();
    answerListing(api, listing);
    answerSigningIn(api, SARAH_KIM);
    const screen = new ListingPage(page);
    const signIn = new SignInPage(page);
    await screen.open(listing.id);

    await screen.header.signIn.click();
    await expect(page).toHaveTitle('Sign in · christian.rent');
    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(page).toHaveURL(`/listings/${listing.id}`);
    await expect(screen.header.memberChip).toHaveText('SK');
    expect(api.bodies.get('POST /api/session')).toEqual([CREDENTIALS]);
  });

  // L2-037 criterion 10; L2-036 criterion 1: what the page says, and its header.
  test('says who signs in here, that accounts are made by the team, and leads back to Browse', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    const signIn = new SignInPage(page);
    await signIn.open();

    await expect(signIn.heading).toHaveText('Sign in');
    await expect(signIn.text).toHaveText(
      'Browsing is open to anyone. Sign in to post, send a message or report a listing.',
    );
    await expect(signIn.note).toHaveText(
      'Accounts are created by the christian.rent team for now. There’s no way to create your own yet.',
    );
    await expect(signIn.header.controls).toHaveText(['christian.rent', 'Post']);
    await signIn.backToBrowse.click();
    await expect(new BrowsePage(page).heading).toBeVisible();
  });

  // L2-037 criterion 7: labels, autocomplete for password managers, paste, and Enter.
  test('works with a password manager and by keyboard alone', async ({ page, api }) => {
    answerNoListings(api);
    answerSigningIn(api, SARAH_KIM);
    const signIn = new SignInPage(page);
    await signIn.open();

    await expect(signIn.email).toHaveAttribute('type', 'email');
    await expect(signIn.email).toHaveAttribute('autocomplete', 'username');
    await expect(signIn.password).toHaveAttribute('type', 'password');
    await expect(signIn.password).toHaveAttribute('autocomplete', 'current-password');
    await signIn.email.focus();
    await page.keyboard.insertText(CREDENTIALS.email);
    await page.keyboard.press('Tab');
    await expect(signIn.password).toBeFocused();
    await page.keyboard.insertText(CREDENTIALS.password);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL('/');
    expect(api.bodies.get('POST /api/session')).toEqual([CREDENTIALS]);
  });

  // L2-037 criterion 8.
  test('sends nothing with an empty field, marks it and moves focus to it', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.email.fill(CREDENTIALS.email);

    await signIn.submit.click();

    await expect(signIn.passwordError).toHaveText('Enter your password.');
    await expect(signIn.password).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.password).toBeFocused();
    await expect(signIn.emailError).toHaveCount(0);
  });

  // L2-037 criterion 2: one refusal, the email kept and the password cleared.
  test('refuses alike whatever was wrong, keeping the email and clearing the password', async ({
    page,
    api,
  }) => {
    api.refuse('POST', '/api/session', 401, 'sign_in_failed');
    const signIn = new SignInPage(page);
    await signIn.open();

    await signIn.signIn(CREDENTIALS.email, 'not the password');

    await expect(signIn.alert).toHaveRole('alert');
    await expect(signIn.alertTitle).toHaveText('That email and password don’t match an account.');
    await expect(signIn.email).toHaveValue(CREDENTIALS.email);
    await expect(signIn.password).toHaveValue('');
    await expect(signIn.password).toBeFocused();
  });

  // L2-037 criterion 4.
  test('says when this device may try again after too many attempts', async ({ page, api }) => {
    await page.clock.setFixedTime(new Date('2026-06-08T15:00:00-07:00'));
    api.answer('POST', '/api/session', {
      status: 429,
      body: { type: 'about:blank', title: 'Refused', status: 429, code: 'rate_limited' },
      headers: { 'content-type': 'application/problem+json', 'retry-after': '900' },
    });
    const signIn = new SignInPage(page);
    await signIn.open();

    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

    await expect(signIn.alertTitle).toHaveText('Too many attempts from this device.');
    await expect(signIn.alertText).toHaveText('You can try again today at 3:15 p.m.');
  });

  // L2-037 criterion 9: busy while in flight, and a backend that cannot be reached.
  test('is busy while signing in, and says so when christian.rent cannot be reached', async ({
    page,
    api,
  }) => {
    const release = api.hold('POST', '/api/session');
    api.answer('POST', '/api/session', { status: 503 });
    const signIn = new SignInPage(page);
    await signIn.open();

    await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);
    await expect(signIn.submit).toHaveAttribute('aria-busy', 'true');
    await expect(signIn.email).toHaveAttribute('readonly', '');
    release();

    await expect(signIn.alertTitle).toHaveText('We couldn’t reach christian.rent.');
    await expect(signIn.email).toHaveValue(CREDENTIALS.email);
  });

  // L2-037 criterion 6: no open redirect.
  for (const away of ['https://evil.example/', '//evil.example', '/\\evil.example']) {
    test(`follows no return address off rent: ${away}`, async ({ page, api }) => {
      answerNoListings(api);
      answerSigningIn(api, SARAH_KIM);
      const signIn = new SignInPage(page);
      await signIn.open(`return=${encodeURIComponent(away)}`);

      await signIn.signIn(CREDENTIALS.email, CREDENTIALS.password);

      await expect(page).toHaveURL('/');
    });
  }

  // L2-037 criterion 11.
  test('sends someone already signed in to the return address', async ({ page, api }) => {
    answerMember(api);
    answerNoListings(api);
    const signIn = new SignInPage(page);

    await signIn.open('return=%2F%3Fshow%3Dwanted');

    await expect(page).toHaveURL('/?show=wanted');
  });

  // L2-040 criterion 2: the page says that the session ended.
  test('says that the session ended when it did', async ({ page }) => {
    const signIn = new SignInPage(page);

    await signIn.open('return=%2Fpost&expired=1');

    await expect(signIn.alertTitle).toHaveText('Your session ended.');
    await expect(signIn.alertText).toHaveText(
      'Sign in again to carry on. What you were writing is kept.',
    );
  });
});
