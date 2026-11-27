import type { Routes } from '@angular/router';
import { devRoutes } from './dev-routes';

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
    // Signing in to `rent` (L2-037); the address to come back to is `return`.
    path: 'sign-in',
    title: 'Sign in',
    loadComponent: () => import('./pages/sign-in/sign-in-page').then((m) => m.SignInPage),
  },
  ...devRoutes,
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
