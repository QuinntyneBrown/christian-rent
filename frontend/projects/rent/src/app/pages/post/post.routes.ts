import type { Routes } from '@angular/router';
import { HttpListingsApi, HttpPhotosApi, LISTINGS_API, PHOTOS_API } from '@rent/api';
import { PostPage } from './post-page';

/**
 * Post's route binds its own clients, so neither its page, its photo picker nor the clients
 * are in the initial bundle (L2-029, criterion 2; ADR 0021).
 */
export default [
  {
    path: '',
    providers: [
      { provide: LISTINGS_API, useClass: HttpListingsApi },
      { provide: PHOTOS_API, useClass: HttpPhotosApi },
    ],
    component: PostPage,
  },
] satisfies Routes;
