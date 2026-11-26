import type { Routes } from '@angular/router';
import {
  HttpListingsApi,
  HttpMessagesApi,
  HttpReportsApi,
  LISTINGS_API,
  MESSAGES_API,
  REPORTS_API,
} from '@rent/api';
import { ListingPage } from './listing-page';

/**
 * Listing's route binds its own clients, so neither they nor the page are in the initial bundle
 * (L2-029, criterion 2).
 */
export default [
  {
    path: '',
    providers: [
      { provide: LISTINGS_API, useClass: HttpListingsApi },
      { provide: MESSAGES_API, useClass: HttpMessagesApi },
      { provide: REPORTS_API, useClass: HttpReportsApi },
    ],
    component: ListingPage,
  },
] satisfies Routes;
