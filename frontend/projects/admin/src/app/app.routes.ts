import type { Routes } from '@angular/router';
import { HttpReviewQueueApi, REVIEW_QUEUE_API } from '@rent/api';
import { adminGuard } from './admin-guard';

/**
 * Admin's routes (ADR 0028). Every route is lazy (L2-029, criterion 2). The review page matches
 * for an admin alone, so nobody else downloads it or asks for its data; anyone else gets the
 * forbidden page at the same address. Any other address leads back to the review queue's.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Admin',
    canMatch: [adminGuard],
    // The route binds the client the review page alone uses; the page provides its own state.
    providers: [{ provide: REVIEW_QUEUE_API, useClass: HttpReviewQueueApi }],
    loadComponent: () => import('./review/review-page').then((m) => m.ReviewPage),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'Admin',
    loadComponent: () => import('./forbidden/forbidden-page').then((m) => m.ForbiddenPage),
  },
  { path: '**', redirectTo: '' },
];
