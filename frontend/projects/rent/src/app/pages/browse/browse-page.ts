import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import {
  Button,
  EmptyState,
  Hero,
  Icon,
  ListingCard,
  ListingGrid,
  SiteHeader,
} from '@rent/components';
import { BrowseStore } from './browse-store';

/**
 * Browse, the home screen (browse-listings design): the headline with the two buttons that lead
 * to posting, and approved listings, newest first. Search-and-filter adds the search bar and the
 * switch.
 */
@Component({
  selector: 'cr-browse-page',
  imports: [
    Button,
    EmptyState,
    Hero,
    Icon,
    ListingCard,
    ListingGrid,
    NgTemplateOutlet,
    RouterLink,
    SiteHeader,
  ],
  providers: [BrowseStore],
  templateUrl: './browse-page.html',
  styleUrl: './browse-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowsePage {
  protected readonly member = inject(SESSION).member;
  protected readonly store = inject(BrowseStore);
  /** Eight skeleton cards: two rows at the widest, enough to fill a phone (L2-033, criterion 1). */
  protected readonly skeletons = Array.from({ length: 8 });

  constructor() {
    void this.store.loadFirst();
  }
}
