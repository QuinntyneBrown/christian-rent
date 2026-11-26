// Acceptance Test
// Traces to: L2-009, L2-015, L2-017, L2-021, L2-025, L2-032, L2-036
// Description: MemberGate asks a person who is not a member to join, in a dialog that loads only then, and returns them as a member with their initials in the header.
import { CHURCHES, SARAH_KIM, answerJoining, answerMember } from '../fixtures/members';
import { expect, test } from '../fixtures/test';
import { JoinDialogPart } from '../pages/join-dialog.part';
import { MemberGateHostPage } from '../pages/member-gate-host.page';

test.describe('Becoming a member', () => {
  // L2-009 criterion 4; L2-017 criteria 1 to 3, 7 to 9; L2-036 criterion 2: a person who is not
  // a member tries to post, joins with a listed church and the declaration, and is back where
  // they were as a member, their initials in the header.
  test('a person who is not a member joins with a listed church and returns as a member @critical', async ({
    page,
    api,
  }) => {
    answerJoining(api);
    const host = new MemberGateHostPage(page);
    const dialog = new JoinDialogPart(page);
    await host.open();
    await expect(host.header.memberChip).toHaveCount(0);

    await host.post.click();

    await expect(dialog.title).toHaveText('Become a member to post');
    await expect(dialog.root).toHaveAccessibleName('Become a member to post');
    await expect(dialog.description).toHaveText(
      'Browsing is open to anyone. To post, message or report, tell us who you are. What you’ve filled in is kept.',
    );
    await expect(dialog.name).toBeFocused();
    await expect(dialog.name).toHaveAttribute('maxlength', '60');
    await expect(dialog.church.locator('option')).toHaveText([
      'Choose a church',
      ...CHURCHES.map((church) => `${church.name}, ${church.city}`),
      'My church isn’t listed',
    ]);
    await expect(dialog.declaration).not.toBeChecked();

    await dialog.fill('Sarah Kim', 'Grace Community Church, Langley');
    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(host.answer).toHaveText('Member: yes');
    await expect(host.header.memberChip).toHaveText('SK');
    await expect(host.header.memberChip).toHaveAccessibleName('Signed in as Sarah Kim');
    expect(api.bodies.get('POST /api/members')).toEqual([
      {
        name: 'Sarah Kim',
        churchId: CHURCHES[1]!.id,
        newChurchName: null,
        newChurchCity: null,
        declaresChristian: true,
      },
    ]);
  });

  // become-member design: a member is let through, and the dialog's code is never loaded.
  test('a member is let through without the dialog, whose code never loads', async ({
    page,
    api,
  }) => {
    answerMember(api);
    const host = new MemberGateHostPage(page);
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await host.open();
    await expect(host.header.memberChip).toHaveText('SK');

    await host.post.click();

    await expect(host.answer).toHaveText('Member: yes');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(api.requests).not.toContain('GET /api/churches');
    expect(scripts.filter((url) => url.includes('join-dialog'))).toEqual([]);
  });

  // L2-029; AGENTS.md: the dialog's code loads only when a person who is not a member asks.
  test('the dialog loads only when it is needed', async ({ page, api }) => {
    answerJoining(api);
    const host = new MemberGateHostPage(page);
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await host.open();
    expect(scripts.filter((url) => url.includes('join-dialog'))).toEqual([]);

    await host.post.click();

    await expect(new JoinDialogPart(page).title).toBeVisible();
    expect(scripts.filter((url) => url.includes('join-dialog'))).not.toEqual([]);
  });

  // L2-017 criterion 12; ADR 0018: one dialog for posting, messaging and reporting, its title
  // naming which.
  for (const [purpose, title] of [
    ['message', 'Become a member to send a message'],
    ['report', 'Become a member to report'],
  ] as const) {
    test(`the same dialog asks a person who tries to ${purpose}`, async ({ page, api }) => {
      answerJoining(api);
      const host = new MemberGateHostPage(page);
      const dialog = new JoinDialogPart(page);
      await host.open();

      await host[purpose].click();

      await expect(dialog.title).toHaveText(title);
      await expect(dialog.name).toBeVisible();
    });
  }

  // L2-017 criterion 7; L2-032 criterion 9: "Not now" leaves without joining, changes nothing,
  // and focus returns to the control that opened the dialog.
  test('"Not now" leaves without joining and returns focus', async ({ page, api }) => {
    answerJoining(api);
    const host = new MemberGateHostPage(page);
    const dialog = new JoinDialogPart(page);
    await host.open();
    await host.draft.fill('Pressure washer and drill kit');
    await host.post.click();
    await dialog.name.fill('Sarah Kim');

    await dialog.notNow.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(host.answer).toHaveText('Member: no');
    await expect(host.post).toBeFocused();
    await expect(host.draft).toHaveValue('Pressure washer and drill kit');
    expect(api.requests).not.toContain('POST /api/members');
  });

  // L2-032 criterion 9: focus stays inside the dialog; Escape and Close close it and return
  // focus to the control that opened it.
  test('the dialog holds focus, and Escape or Close return it', async ({ page, api }) => {
    answerJoining(api);
    const host = new MemberGateHostPage(page);
    const dialog = new JoinDialogPart(page);
    await host.open();
    await host.message.click();
    await expect(dialog.name).toBeFocused();

    for (let step = 0; step < 12; step++) {
      await page.keyboard.press('Tab');
      await expect(dialog.root.locator(':focus')).toHaveCount(1);
    }
    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(host.message).toBeFocused();

    await host.report.click();
    await dialog.close.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(host.report).toBeFocused();
    await expect(host.answer).toHaveText('Member: no');
  });

  // become-member design: the gate asks again before opening the dialog, so a person who has
  // become a member meanwhile is not asked.
  test('a person who became a member meanwhile is not asked', async ({ page, api }) => {
    const host = new MemberGateHostPage(page);
    await host.open();
    answerMember(api, SARAH_KIM);

    await host.post.click();

    await expect(host.answer).toHaveText('Member: yes');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(host.header.memberChip).toHaveText('SK');
  });
});
