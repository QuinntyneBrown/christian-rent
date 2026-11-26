// Acceptance Test
// Traces to: L2-017, L2-031, L2-032, L2-033
// Description: The join dialog's states as docs/mocks/dialogs/join/ draws them: a new church, invalid, busy, failed with "Try again", churches that fail to load, and a bottom sheet on a phone.
import type { Page } from '@playwright/test';
import { CHURCHES, SARAH_KIM, answerJoining } from '../fixtures/members';
import { expect, test } from '../fixtures/test';
import { JoinDialogPart } from '../pages/join-dialog.part';
import { MemberGateHostPage } from '../pages/member-gate-host.page';

async function openDialog(page: Page): Promise<JoinDialogPart> {
  const host = new MemberGateHostPage(page);
  await host.open();
  await host.post.click();
  const dialog = new JoinDialogPart(page);
  await expect(dialog.church.locator('option')).toHaveCount(CHURCHES.length + 2);
  return dialog;
}

test.describe('The join dialog', () => {
  // L2-017 criteria 2 and 8 (new-church.html): "My church isn't listed" asks for the church's
  // name and city and says that an admin confirms it.
  test('a person whose church is not listed enters its name and city', async ({ page, api }) => {
    answerJoining(api);
    const dialog = await openDialog(page);
    await expect(dialog.newChurchName).toHaveCount(0);

    await dialog.church.selectOption({ label: 'My church isn’t listed' });

    await expect(dialog.newChurchName).toHaveAttribute('maxlength', '100');
    await expect(dialog.newChurchCity).toHaveAttribute('maxlength', '80');
    await expect(dialog.newChurchNote).toBeVisible();
    await dialog.name.fill('Sarah Kim');
    await dialog.newChurchName.fill('Fort Langley Evangelical Free');
    await dialog.newChurchCity.fill('Fort Langley');
    await dialog.declaration.check();
    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    expect(api.bodies.get('POST /api/members')).toEqual([
      {
        name: 'Sarah Kim',
        churchId: null,
        newChurchName: 'Fort Langley Evangelical Free',
        newChurchCity: 'Fort Langley',
        declaresChristian: true,
      },
    ]);
  });

  // L2-017 criteria 1 and 10; L2-032 criterion 5 (invalid.html): with nothing given, each item
  // is marked and says why, tied to its field; nothing is sent, and focus goes to the first.
  test('sent with nothing, it marks the name, the church and the declaration', async ({
    page,
    api,
  }) => {
    answerJoining(api);
    const dialog = await openDialog(page);

    await dialog.submit.click();

    await expect(dialog.errors).toHaveText([
      'Enter your name, up to 60 characters.',
      'Choose your church, or choose “My church isn’t listed”.',
      'Tick the box to declare that you are a Christian.',
    ]);
    await expect(dialog.name).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.name).toHaveAccessibleDescription('Enter your name, up to 60 characters.');
    await expect(dialog.church).toHaveAccessibleDescription(
      'Choose your church, or choose “My church isn’t listed”.',
    );
    await expect(dialog.declaration).toHaveAccessibleDescription(
      'Tick the box to declare that you are a Christian.',
    );
    await expect(dialog.name).toBeFocused();
    expect(api.requests).not.toContain('POST /api/members');

    // What was entered is kept, and an error goes as its field is put right.
    await dialog.name.fill('Sarah Kim');
    await expect(dialog.errors).toHaveCount(2);
    await expect(dialog.name).toHaveValue('Sarah Kim');
    await expect(dialog.name).not.toHaveAttribute('aria-invalid');
  });

  // L2-017 criterion 10 with a new church: its name and city are each marked.
  test('a new church with no name or city marks both', async ({ page, api }) => {
    answerJoining(api);
    const dialog = await openDialog(page);
    await dialog.name.fill('Sarah Kim');
    await dialog.church.selectOption({ label: 'My church isn’t listed' });
    await dialog.declaration.check();

    await dialog.submit.click();

    await expect(dialog.errors).toHaveText([
      'Enter your church’s name, up to 100 characters.',
      'Enter your church’s city, up to 80 characters.',
    ]);
    await expect(dialog.newChurchName).toBeFocused();
  });

  // L2-017 criterion 11 (busy.html): while joining is in flight the button is busy, the fields
  // cannot be changed and the dialog cannot be left.
  test('while joining, the button is busy and nothing can be changed', async ({ page, api }) => {
    answerJoining(api);
    const release = api.hold('POST', '/api/members');
    const dialog = await openDialog(page);
    await dialog.fill('Sarah Kim', 'Grace Community Church, Langley');

    await dialog.submit.click();

    await expect(dialog.submit).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.name).toHaveAttribute('readonly', '');
    await expect(dialog.church).toBeDisabled();
    await expect(dialog.declaration).toBeDisabled();
    await expect(dialog.notNow).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await dialog.notNow.dispatchEvent('click');
    await expect(dialog.panel).toBeVisible();
    await expect(dialog.name).toHaveValue('Sarah Kim');

    release();
    await expect(dialog.root).toHaveCount(0);
  });

  // L2-017 criterion 11; L2-032 criterion 4 (failed.html): a failed join says so in an
  // announced alert, keeps what was entered, and offers "Try again", which joins.
  test('a failed join keeps what was entered and offers "Try again"', async ({ page, api }) => {
    answerJoining(api);
    let attempts = 0;
    api.answer('POST', '/api/members', () =>
      ++attempts === 1
        ? { status: 503, body: { status: 503, code: null }, headers: {} }
        : { status: 201, body: SARAH_KIM },
    );
    api.answer('GET', '/api/members/me', () =>
      attempts > 1 ? { body: SARAH_KIM } : { status: 204 },
    );
    const host = new MemberGateHostPage(page);
    const dialog = await openDialog(page);
    await dialog.fill('Sarah Kim', 'Grace Community Church, Langley');

    await dialog.submit.click();

    await expect(dialog.alert).toContainText('You weren’t added.');
    await expect(dialog.alert).toContainText(
      'We couldn’t reach christian.rent. What you entered is still here.',
    );
    await expect(dialog.submit).toHaveText('Try again');
    await expect(dialog.name).toHaveValue('Sarah Kim');
    await expect(dialog.church).toHaveValue(CHURCHES[1]!.id);
    await expect(dialog.declaration).toBeChecked();

    await dialog.submit.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(host.answer).toHaveText('Member: yes');
    expect(api.bodies.get('POST /api/members')).toHaveLength(2);
  });

  // L2-017 criterion 13 (churches-failed.html): when the churches cannot be loaded the field
  // says so, a new church can still be entered, and "Try again" asks again.
  test('churches that fail to load can be asked for again', async ({ page, api }) => {
    answerJoining(api);
    let asked = 0;
    api.answer('GET', '/api/churches', () =>
      ++asked === 1 ? { status: 503 } : { body: CHURCHES },
    );
    const host = new MemberGateHostPage(page);
    await host.open();
    await host.post.click();
    const dialog = new JoinDialogPart(page);

    await expect(dialog.church).toHaveAccessibleDescription(
      'We couldn’t load the list of churches. Try again, or choose “My church isn’t listed” to enter yours.',
    );
    await expect(dialog.church.locator('option')).toHaveText([
      'Choose a church',
      'My church isn’t listed',
    ]);

    await dialog.reloadChurches.click();

    await expect(dialog.church.locator('option')).toHaveCount(CHURCHES.length + 2);
    await expect(dialog.churchHelp).toHaveCount(0);
  });

  // L2-031; become-member design: under 640 px the dialog is a bottom sheet; from 640 px it is
  // a centred panel. Every control is at least 44 px tall.
  for (const [width, sheet] of [
    [360, true],
    [1280, false],
  ] as const) {
    test(`at ${width} px the dialog is ${sheet ? 'a bottom sheet' : 'centred'}`, async ({
      page,
      api,
    }) => {
      answerJoining(api);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 800 });
      const dialog = await openDialog(page);

      const panel = (await dialog.panel.boundingBox())!;
      if (sheet) {
        expect(Math.round(panel.y + panel.height)).toBe(800);
        expect(Math.round(panel.width)).toBe(width);
      } else {
        expect(Math.round(panel.y + panel.height / 2)).toBe(400);
        expect(panel.width).toBeLessThanOrEqual(512);
      }
      for (const control of [dialog.close, dialog.notNow, dialog.submit, dialog.name]) {
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
    });
  }
});
