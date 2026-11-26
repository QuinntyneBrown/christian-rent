import type { Routes } from '@angular/router';
import { HttpReviewQueueApi, REVIEW_QUEUE_API } from '@rent/api';
import { ReviewPage } from './review/review-page';

/**
 * Admin's routes. `rent` loads them behind its admin guard, so none of this library is sent to
 * anyone else (L2-018, criterion 3). They bind the client Admin alone uses; each page provides
 * its own state, which goes when the admin leaves.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: REVIEW_QUEUE_API, useClass: HttpReviewQueueApi }],
    component: ReviewPage,
  },
];
