import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  untracked,
  viewChild,
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
import { MessageComposer } from './message-composer';

/**
 * Listing, one listing at `/listings/:id` (read-listing design): its photos or its wanted panel,
 * what it is, where and when, its note and who posted it, with the message box beside it from
 * 768 px (L2-007, L2-008, L2-031). The box sends a message to the person who posted, through
 * `MessageComposer` (send-message design; L2-015); on the member's own listing it offers none. An address with no listing anyone may see behind it is
 * "not found", which reveals nothing (criterion 4). Once loaded, the document title is the
 * listing's title (ADR 0016). Leaving releases the store and the composer, which abort their
 * requests.
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
  providers: [ListingStore, MessageComposer],
  templateUrl: './listing-page.html',
  styleUrl: './listing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingPage {
  /** The listing's identifier, from the address. */
  readonly id = input.required<string>();

  protected readonly member = inject(SESSION).member;
  protected readonly store = inject(ListingStore);
  protected readonly composer = inject(MessageComposer);
  private readonly box = viewChild(MessageBox);
  private readonly injector = inject(Injector);
  private readonly titles = inject(RentTitleStrategy);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.composer.open(id);
        void this.store.load(id);
      });
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

  /**
   * Sends the message. With an invalid field, focus moves to the summary; once it is sent, to
   * the confirmation, which announces it (L2-015, criteria 10 and 12).
   */
  protected async send(): Promise<void> {
    const valid = await this.composer.send();
    if (!valid) {
      afterNextRender(() => this.box()?.focusSummary(), { injector: this.injector });
    } else if (this.composer.state() === 'sent') {
      afterNextRender(() => this.box()?.focusSent(), { injector: this.injector });
    }
  }
}
