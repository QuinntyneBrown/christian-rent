import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { SESSION } from '@rent/api';

/**
 * Matches Admin's route only for an admin, once the session knows who is signed in (ADR 0024).
 * When it does not match, `@rent/admin` is never requested and the next `admin` route shows
 * `ForbiddenPage`. A convenience: the backend refuses anyone else (L2-019, criterion 5).
 */
export const adminGuard: CanMatchFn = async () => {
  const session = inject(SESSION);
  await session.ready();
  return session.member()?.isAdmin === true;
};
