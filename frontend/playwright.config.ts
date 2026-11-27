import { defineConfig, devices } from '@playwright/test';
import { ADMIN_ORIGIN, ADMIN_PORT, RENT_ORIGIN, RENT_PORT } from './e2e/fixtures/origins';

/**
 * Behaviour specs run by default (`npm run e2e`). The visual, responsive, accessibility and heap
 * sweeps in e2e/sweeps run only when a person asks (`npm run e2e:sweeps`), never in CI.
 * Chromium only (AGENTS.md). Every API request is answered by a fixture (e2e/fixtures/api.ts).
 *
 * `rent` and `admin` are two applications on two origins (ADR 0028): each project runs its own
 * specs against its own dev server, and both servers start together.
 */
const sweeps = process.env['SWEEPS'] === '1';
const chrome = devices['Desktop Chrome'];

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  use: { trace: 'off' },
  projects: sweeps
    ? // A sweep names Admin's screens by Admin's origin, so one project covers both.
      [{ name: 'sweeps', testDir: './e2e/sweeps', use: { ...chrome, baseURL: RENT_ORIGIN } }]
    : [
        { name: 'rent', testDir: './e2e/specs/rent', use: { ...chrome, baseURL: RENT_ORIGIN } },
        { name: 'admin', testDir: './e2e/specs/admin', use: { ...chrome, baseURL: ADMIN_ORIGIN } },
      ],
  webServer: [
    {
      // The e2e build adds the host pages of ADR 0018; no other build has them.
      command: `npx ng serve rent --configuration e2e --port ${RENT_PORT}`,
      url: RENT_ORIGIN,
      reuseExistingServer: !process.env['CI'],
      timeout: 240_000,
    },
    {
      command: `npx ng serve admin --configuration development --port ${ADMIN_PORT}`,
      url: ADMIN_ORIGIN,
      reuseExistingServer: !process.env['CI'],
      timeout: 240_000,
    },
  ],
});
