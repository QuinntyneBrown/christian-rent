import { expect, test } from '../fixtures/test';
import { SCREENS } from './screens';

// Run only when a person asks (npm run e2e:sweeps). Update baselines only for an intentional
// design change, after changing the mock (AGENTS.md).
for (const screen of SCREENS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [360, 1280]) {
      test(`${screen.name} looks as the mock draws it, ${colorScheme}, ${width} px`, async ({
        page,
        api,
      }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.setViewportSize({ width, height: 800 });
        screen.answer(api);
        await screen.before?.(page);
        await page.goto(screen.path);
        await screen.then?.(page, api);
        await expect(page).toHaveScreenshot(`${screen.name}-${colorScheme}-${width}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
