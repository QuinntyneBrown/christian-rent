import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { SESSION } from '@rent/api';

/**
 * Lets the review page's route match for an admin alone, so nobody else is sent its code or asks
 * for its data (L2-019, criterion 5; L2-038, criteria 2 and 3; ADR 0028, ADR 0029). It asks who is
 * signed in to Admin first, because the review queue's address may be the first one opened.
 * Anyone not signed in to Admin is sent to Admin's sign-in page, to come back here; anyone else
 * gets the next route, the forbidden page. It only chooses what to show: the backend refuses
 * anyone else (L2-025).
 */
export const adminGuard: CanMatchFn = async (_route, segments) => {
  const session = inject(SESSION);
  const router = inject(Router);
  await session.refresh();
  if (session.state() === 'signed-out') {
    const here = '/' + segments.map((segment) => segment.path).join('/');
    return router.createUrlTree(['/sign-in'], { queryParams: { return: here } });
  }
  return session.member()?.isAdmin === true;
};
