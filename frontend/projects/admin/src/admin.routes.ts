import type { Routes } from '@angular/router';
import { HttpReviewQueueApi, REVIEW_QUEUE_API } from '@rent/api';
import { ReviewPage } from './review/review-page';

/**
 * Admin's routes, loaded only through `rent`'s `/admin` route once `adminGuard` has matched
 * (ADR 0024). The route binds its own client, so it is downloaded by an admin alone; the page
 * provides its own state, which goes when the admin leaves.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: REVIEW_QUEUE_API, useClass: HttpReviewQueueApi }],
    component: ReviewPage,
  },
];
