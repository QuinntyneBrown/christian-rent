import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { SESSION } from '@rent/api';

/**
 * Lets Admin's route match for an admin alone, so nobody else is sent its code (L2-018,
 * criterion 3; ADR 0024). It asks who is signed in first, because Admin's address may be the
 * first one opened. It only chooses what to show: the backend refuses anyone else (L2-025).
 */
export const adminGuard: CanMatchFn = async () => {
  const session = inject(SESSION);
  await session.refresh();
  return session.member()?.isAdmin === true;
};
