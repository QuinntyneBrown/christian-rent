/**
 * The two applications' dev servers (ADR 0028). Each Playwright project opens its own; a spec that
 * crosses from Admin to the site names the other by its origin.
 */
export const RENT_PORT = Number(process.env['E2E_PORT'] ?? 4200);
export const ADMIN_PORT = Number(process.env['E2E_ADMIN_PORT'] ?? 4300);
export const RENT_ORIGIN = `http://localhost:${RENT_PORT}`;
export const ADMIN_ORIGIN = `http://localhost:${ADMIN_PORT}`;
