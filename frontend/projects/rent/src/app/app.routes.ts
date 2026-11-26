import type { Routes } from '@angular/router';

/**
 * Every route is lazy (L2-029, criterion 2). Listing, Post and Admin are added by their journeys.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Browse',
    loadChildren: () => import('./pages/browse/browse.routes'),
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
