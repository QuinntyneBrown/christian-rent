import { defineConfig, devices } from '@playwright/test';

/**
 * Behaviour specs run by default (`npm run e2e`). The visual, responsive, accessibility and heap
 * sweeps in e2e/sweeps run only when a person asks (`npm run e2e:sweeps`), never in CI.
 * Chromium only (AGENTS.md). Every API request is answered by a fixture (e2e/fixtures/api.ts).
 */
const sweeps = process.env['SWEEPS'] === '1';
const port = Number(process.env['E2E_PORT'] ?? 4200);

export default defineConfig({
  testDir: sweeps ? './e2e/sweeps' : './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The e2e build adds the host pages of ADR 0018; no other build has them.
    command: `npx ng serve rent --configuration e2e --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 240_000,
  },
});
