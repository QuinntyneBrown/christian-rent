import type { Routes } from '@angular/router';
import { HttpListingsApi, LISTINGS_API } from '@rent/api';
import { BrowsePage } from './browse-page';

/** Browse's route binds its own client, so neither is in the initial bundle (L2-029, criterion 2). */
export default [
  {
    path: '',
    providers: [{ provide: LISTINGS_API, useClass: HttpListingsApi }],
    component: BrowsePage,
  },
] satisfies Routes;
