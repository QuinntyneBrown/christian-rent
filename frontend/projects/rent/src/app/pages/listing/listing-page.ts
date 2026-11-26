import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import {
  Button,
  Icon,
  Listing,
  ListingLayout,
  ListingToolbar,
  MessageBox,
  PlainPage,
  SiteHeader,
} from '@rent/components';
import { RentTitleStrategy } from '../../shell/rent-title-strategy';
import { ListingStore } from './listing-store';

/**
 * Listing, one listing at `/listings/:id` (read-listing design): its photos or its wanted panel,
 * what it is, where and when, its note and who posted it, with the message box's head beside it
 * from 768 px (L2-007, L2-008, L2-031). An address with no listing anyone may see behind it is
 * "not found", which reveals nothing (criterion 4). Once loaded, the document title is the
 * listing's title (ADR 0016). Leaving releases the store, which aborts its request.
 */
@Component({
  selector: 'cr-listing-page',
  imports: [
    Button,
    Icon,
    Listing,
    ListingLayout,
    ListingToolbar,
    MessageBox,
    PlainPage,
    RouterLink,
    SiteHeader,
  ],
  providers: [ListingStore],
  templateUrl: './listing-page.html',
  styleUrl: './listing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingPage {
  /** The listing's identifier, from the address. */
  readonly id = input.required<string>();

  protected readonly member = inject(SESSION).member;
  protected readonly store = inject(ListingStore);
  private readonly titles = inject(RentTitleStrategy);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
    effect(() => {
      const state = this.store.state();
      const view = this.store.view();
      if (state === 'loaded' && view) {
        this.titles.setPageTitle(view.title);
      } else if (state === 'not-found') {
        this.titles.setPageTitle('Listing not found');
      }
    });
  }
}
