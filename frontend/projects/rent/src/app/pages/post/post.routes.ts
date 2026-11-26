import type { Routes } from '@angular/router';
import { HttpListingsApi, LISTINGS_API } from '@rent/api';
import { PostPage } from './post-page';

/**
 * Post's route binds its own client, so neither its page nor the client is in the initial
 * bundle (L2-029, criterion 2).
 */
export default [
  {
    path: '',
    providers: [{ provide: LISTINGS_API, useClass: HttpListingsApi }],
    component: PostPage,
  },
] satisfies Routes;
