import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { DIALOG_DATA, type Dialog, DialogRef } from '@angular/cdk/dialog';
import { Alert, Button, Dialog as DialogPanel, RadioGroup, Textarea } from '@rent/components';
import { REPORT_NOTE_LIMIT, REPORT_REASONS, toReportDialogCopy } from '@rent/domain';
import { ReportStore } from './report-store';

/** The listing being reported, and what the page is told of it. */
export interface ReportDialogData {
  readonly listingId: string;
  /** Who is never told who reported. */
  readonly posterFirstName: string;
  /** When the member reported it before, or null; with it the dialog asks nothing. */
  readonly reportedAt: string | null;
  /** Called as soon as a report is known to be filed, however the dialog is closed after. */
  readonly reported: (reportedAt: string) => void;
}

/** "Done", or "OK, close". */
const ACKNOWLEDGE = '.report-dialog__acknowledge';

/** What the dialog closes with when the screen has to read the listing again. */
export type ReportOutcome = 'listing-changed';

/** The first of the radios, which takes focus as the dialog opens and when none is chosen. */
const FIRST_REASON = 'input[type="radio"]';

/**
 * Opens the dialog over the Listing screen (L2-032, criterion 9): labelled by its title, focus
 * on the first reason, or on "OK, close" for a listing reported before, held inside, and
 * returned to Report when it closes. `injector` is the
 * page's, so the dialog gets the reports client the Listing route binds. `cr-dialog` draws its
 * own backdrop and covers the viewport, so the CDK draws none.
 */
export function openReportDialog(
  dialogs: Dialog,
  data: ReportDialogData,
  injector: Injector,
): DialogRef<ReportOutcome, ReportListingDialog> {
  return dialogs.open<ReportOutcome, ReportDialogData, ReportListingDialog>(ReportListingDialog, {
    data,
    injector,
    ariaLabelledBy: 'report-title',
    ariaDescribedBy: 'report-description',
    autoFocus: data.reportedAt === null ? FIRST_REASON : ACKNOWLEDGE,
    restoreFocus: true,
    hasBackdrop: false,
  });
}

/**
 * "Report this listing" (report-listing design; L2-021; docs/mocks/dialogs/report-listing/): a
 * reason and an optional note, then a confirmation that is announced. Its states are default,
 * invalid, busy, failed, success and already. While the report is sent nothing can be changed or
 * closed; a send that fails keeps what was entered. A listing taken down meanwhile closes it, so
 * the screen reads the listing again. Its code loads only when the Listing screen opens it.
 */
@Component({
  selector: 'cr-report-listing-dialog',
  imports: [Alert, Button, DialogPanel, RadioGroup, Textarea],
  providers: [ReportStore],
  templateUrl: './report-listing-dialog.html',
  styleUrl: './report-listing-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportListingDialog {
  protected readonly store = inject(ReportStore);
  protected readonly reasons = REPORT_REASONS;
  protected readonly noteLimit = REPORT_NOTE_LIMIT;

  private readonly data = inject<ReportDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<ReportOutcome>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly busy = computed(() => this.store.state() === 'busy');
  protected readonly step = computed(() => {
    const state = this.store.state();
    return state === 'success' || state === 'already' ? state : 'form';
  });
  protected readonly copy = computed(() =>
    toReportDialogCopy(this.step(), this.data.posterFirstName, this.store.reportedAt()),
  );
  protected readonly icon = computed(() => {
    const step = this.step();
    return step === 'form' ? null : step === 'success' ? 'check' : 'info';
  });
  /** What replaced the form, for a screen reader; nothing while the form is shown. */
  protected readonly announcement = computed(() =>
    this.step() === 'form' ? '' : `${this.copy().title} ${this.copy().description}`,
  );

  constructor() {
    if (this.data.reportedAt !== null) {
      this.store.openAsReported(this.data.reportedAt);
    }
    // Escape and Close do nothing while the report is in flight (L2-021, criterion 9).
    effect(() => {
      this.dialogRef.disableClose = this.busy();
    });
  }

  protected close(): void {
    if (!this.busy()) {
      this.dialogRef.close();
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const result = await this.store.send(this.data.listingId);
    if (result === 'invalid') {
      this.focusOnceDrawn(FIRST_REASON);
    } else if (result === 'reported' || result === 'already') {
      this.data.reported(this.store.reportedAt()!);
      // The control that had focus is gone with the form.
      this.focusOnceDrawn(ACKNOWLEDGE);
    } else if (result === 'listing-changed') {
      this.dialogRef.close(result);
    }
  }

  private focusOnceDrawn(selector: string): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
