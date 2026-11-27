import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Button,
  Icon,
  Listing,
  ListingLayout,
  ListingToolbar,
  MessageBox,
  PlainPage,
} from '@rent/components';
import { MemberGate } from '../../members/member-gate';
import { ShellTitleStrategy } from '@rent/shell';
import { ListingStore } from './listing-store';
import { MessageComposer } from './message-composer';

/**
 * Listing, one listing at `/listings/:id` (read-listing design): its photos or its wanted panel,
 * what it is, where and when, its note and who posted it, with the message box beside it from
 * 768 px (L2-007, L2-008, L2-031). The box sends a message to the person who posted, through
 * `MessageComposer` (send-message design; L2-015); on the member's own listing it offers none.
 * Report, on a listing that is not the member's own, opens the report dialog, whose code loads
 * only then (report-listing design; L2-021). An address with no listing anyone may see behind it is
 * "not found", which reveals nothing (criterion 4). Once loaded, the document title is the
 * listing's title (ADR 0016). Leaving releases the store and the composer, which abort their
 * requests.
 */
import { RentHeader } from '../../shell/rent-header';

@Component({
  selector: 'cr-listing-page',
  imports: [
    RentHeader,
    Button,
    Icon,
    Listing,
    ListingLayout,
    ListingToolbar,
    MessageBox,
    PlainPage,
    RouterLink,
  ],
  providers: [ListingStore, MessageComposer],
  templateUrl: './listing-page.html',
  styleUrl: './listing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingPage {
  /** The listing's identifier, from the address. */
  readonly id = input.required<string>();

  protected readonly store = inject(ListingStore);
  protected readonly composer = inject(MessageComposer);
  private readonly box = viewChild(MessageBox);
  private readonly injector = inject(Injector);
  private readonly titles = inject(ShellTitleStrategy);
  private readonly gate = inject(MemberGate);
  private reporting = false;
  private destroyed = false;
  private closeReport: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.closeReport?.();
    });
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
   * Opens the report dialog, once the person is a member (L2-021, criteria 1 and 5). A second
   * press while it is opening does nothing, and nothing opens once the screen has been left. A
   * listing the dialog finds changed is read again, so one taken down is said to be not there
   * (criterion 12).
   */
  protected async report(): Promise<void> {
    if (this.reporting) {
      return;
    }
    this.reporting = true;
    try {
      const id = this.id();
      if (!(await this.gate.requireMember('report'))) {
        return;
      }
      const [{ Dialog }, { openReportDialog }] = await Promise.all([
        import('@angular/cdk/dialog'),
        import('../../report/report-listing-dialog'),
      ]);
      const view = this.store.view();
      if (this.destroyed || this.id() !== id || !view) {
        return;
      }
      const dialog = openReportDialog(
        this.injector.get(Dialog),
        {
          listingId: id,
          posterFirstName: view.posterFirstName,
          reportedAt: view.reportedAt,
          reported: (reportedAt) => this.store.markReported(reportedAt),
        },
        this.injector,
      );
      this.closeReport = () => dialog.close();
      dialog.closed.subscribe((outcome) => {
        this.closeReport = null;
        if (outcome === 'listing-changed' && !this.destroyed) {
          void this.store.load();
        }
      });
    } finally {
      this.reporting = false;
    }
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
