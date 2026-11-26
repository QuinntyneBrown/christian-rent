import type { Routes } from '@angular/router';

/** Every route is lazy (L2-029, criterion 2). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/browse/browse-page').then((m) => m.BrowsePage),
  },
];
