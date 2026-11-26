import type { Routes } from '@angular/router';
import { devRoutes } from './dev-routes';
import { adminGuard } from './members/admin-guard';

/**
 * Every route is lazy (L2-029, criterion 2).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Browse',
    loadChildren: () => import('./pages/browse/browse.routes'),
  },
  {
    // The listing's own title replaces this once it has loaded (ADR 0016).
    path: 'listings/:id',
    title: 'Listing',
    loadChildren: () => import('./pages/listing/listing.routes'),
  },
  {
    path: 'post',
    title: 'Post',
    loadChildren: () => import('./pages/post/post.routes'),
  },
  {
    // Matched only for an admin, so nobody else downloads Admin's code (ADR 0024).
    path: 'admin',
    title: 'Admin',
    canMatch: [adminGuard],
    loadChildren: () => import('@rent/admin').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'admin',
    title: 'Admin',
    loadComponent: () => import('./pages/forbidden/forbidden-page').then((m) => m.ForbiddenPage),
  },
  ...devRoutes,
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
