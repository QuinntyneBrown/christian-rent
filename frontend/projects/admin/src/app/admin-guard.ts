import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { SESSION } from '@rent/api';

/**
 * Lets the review page's route match for an admin alone, so nobody else is sent its code or asks
 * for its data (L2-019, criterion 5; ADR 0028). It asks who is signed in first, because the
 * review queue's address may be the first one opened. Anyone else gets the next route, the
 * forbidden page. It only chooses what to show: the backend refuses anyone else (L2-025).
 */
export const adminGuard: CanMatchFn = async () => {
  const session = inject(SESSION);
  await session.refresh();
  return session.member()?.isAdmin === true;
};
