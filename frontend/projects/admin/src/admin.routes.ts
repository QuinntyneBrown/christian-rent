import type { Routes } from '@angular/router';
import { ReviewPage } from './review/review-page';

/**
 * Admin's routes, loaded only through `rent`'s `/admin` route once `adminGuard` has matched
 * (ADR 0024). The route binds its own clients and state, so they are downloaded by an admin
 * alone and go when the admin leaves.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: ReviewPage,
  },
];
