import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { REPORTS_API, type ReportReason } from '@rent/api';
import {
  REPORT_NOTE_LIMIT,
  type ReportDialogStep,
  cleanReportNote,
  formatCounter,
  toReportRequest,
  validateReportReason,
} from '@rent/domain';

/** The form, the form while it is sent, or a report just sent. */
export type ReportState = ReportDialogStep | 'busy';

/** What a send came to: filed, no reason chosen, or nothing to act on. */
export type ReportResult = 'reported' | 'invalid' | 'ignored';

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
  /** When the report was filed, once it has been. */
  readonly reportedAt = this._reportedAt.asReadonly();
  /** Shown once a send was tried with no reason, until one is chosen. */
  readonly reasonError = computed(() =>
    this.attempted() ? validateReportReason(this._reason()) : null,
  );
  readonly counter = computed(() =>
    formatCounter(cleanReportNote(this._note()).length, REPORT_NOTE_LIMIT),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.abort());
  }

  choose(reason: ReportReason | null): void {
    if (this._state() === 'form') {
      this._reason.set(reason);
    }
  }

  setNote(note: string): void {
    if (this._state() === 'form') {
      this._note.set(note);
    }
  }

  async send(listingId: string): Promise<ReportResult> {
    if (this._state() !== 'form') {
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
      if (request.signal.aborted) {
        return 'ignored';
      }
      throw error;
    }
  }
}
