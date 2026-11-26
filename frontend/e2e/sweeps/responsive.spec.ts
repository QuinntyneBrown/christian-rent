import { expect, test } from '../fixtures/test';
import { SCREENS, WIDTHS } from './screens';

// L2-031 criteria 1 and 6, at every breakpoint. Run only when a person asks.
for (const screen of SCREENS) {
  for (const width of WIDTHS) {
    test(`${screen.name} fits ${width} px with 44 px targets`, async ({ page, api }) => {
      await page.setViewportSize({ width, height: 800 });
      screen.answer(api);
      await page.goto(screen.path);
      await screen.then?.(page);

      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(sideways).toBe(false);

      for (const control of await page.locator('a:visible, button:visible').all()) {
        const box = await control.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  }
}
