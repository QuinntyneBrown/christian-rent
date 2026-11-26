import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { REPORTS_API, type ReportReason, isApiError } from '@rent/api';
import {
  REPORT_NOTE_LIMIT,
  type ReportDialogStep,
  cleanReportNote,
  formatCounter,
  toReportRequest,
  validateReport,
} from '@rent/domain';

/** What the dialog shows, and the form while it is sent or after the send failed. */
export type ReportState = ReportDialogStep | 'busy' | 'failed';

/**
 * What a send came to: filed, filed before, no reason chosen, not sent, refused because the
 * listing is no longer what the screen shows, or nothing to act on.
 */
export type ReportResult =
  'reported' | 'already' | 'invalid' | 'failed' | 'listing-changed' | 'ignored';

/** The refusals after which the screen has to read the listing again (L2-021, criterion 12). */
const LISTING_CHANGED: readonly string[] = ['not_found', 'own_listing'];

/**
 * The report dialog's state, provided by the dialog and gone with it, so nothing typed is kept
 * (report-listing design; ADR 0023). While a report is sent nothing changes and nothing is sent
 * again; closing the dialog aborts it.
 */
@Injectable()
export class ReportStore {
  private readonly api = inject(REPORTS_API);

  private readonly _reason = signal<ReportReason | null>(null);
  private readonly _note = signal('');
  private readonly _state = signal<ReportState>('form');
  private readonly _reportedAt = signal<string | null>(null);
  private readonly attempted = signal(false);
  private request: AbortController | null = null;

  readonly reason = this._reason.asReadonly();
  /** The note as typed. */
  readonly note = this._note.asReadonly();
  readonly state = this._state.asReadonly();
  /** When the member's report was filed, just now or before. */
  readonly reportedAt = this._reportedAt.asReadonly();
  /** Shown once a send was tried with no reason, until one is chosen. */
  readonly reasonError = computed(() => (this.attempted() ? validateReport(this._reason()) : null));
  readonly counter = computed(() =>
    formatCounter(cleanReportNote(this._note()).length, REPORT_NOTE_LIMIT),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.abort());
  }

  /** The listing was reported before: nothing is asked and nothing is sent. */
  openAsReported(reportedAt: string): void {
    this._reportedAt.set(reportedAt);
    this._state.set('already');
  }

  choose(reason: ReportReason | null): void {
    if (this.editable()) {
      this._reason.set(reason);
    }
  }

  setNote(note: string): void {
    if (this.editable()) {
      this._note.set(note);
    }
  }

  async send(listingId: string): Promise<ReportResult> {
    if (!this.editable()) {
      return 'ignored';
    }
    const reason = this._reason();
    if (reason === null) {
      this.attempted.set(true);
      return 'invalid';
    }
    const request = new AbortController();
    this.request = request;
    this._state.set('busy');
    try {
      const reported = await this.api.report(
        listingId,
        toReportRequest(reason, this._note()),
        request.signal,
      );
      this._reportedAt.set(reported.reportedAt);
      this._state.set('success');
      return 'reported';
    } catch (error) {
      return request.signal.aborted ? 'ignored' : this.refused(error);
    }
  }

  private editable(): boolean {
    return this._state() === 'form' || this._state() === 'failed';
  }

  private refused(error: unknown): ReportResult {
    if (isApiError(error)) {
      if (error.code === 'already_reported' && error.reportedAt !== null) {
        this.openAsReported(error.reportedAt);
        return 'already';
      }
      if (LISTING_CHANGED.includes(error.code ?? '')) {
        return 'listing-changed';
      }
    }
    this._state.set('failed');
    if (!isApiError(error)) {
      throw error;
    }
    return 'failed';
  }
}
