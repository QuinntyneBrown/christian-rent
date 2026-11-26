import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/test';
import { SCREENS } from './screens';

// L2-032 criterion 1: WCAG 2.2 AA on every screen, light and dark. Run only when a person asks.
for (const screen of SCREENS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${screen.name} meets WCAG 2.2 AA, ${colorScheme}`, async ({ page, api }) => {
      await page.emulateMedia({ colorScheme });
      screen.answer(api);
      await page.goto(screen.path);
      await screen.then?.(page, api);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
