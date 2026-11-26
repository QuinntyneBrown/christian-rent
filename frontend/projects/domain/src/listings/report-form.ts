import type { ReportListingRequest, ReportReason } from '@rent/api';
import { cleanMessageText } from './message-draft';

/** A report's note is at most this many characters, as it is sent. */
export const REPORT_NOTE_LIMIT = 500;

/** The reasons, in the dialog's order (L2-021, criterion 1; ADR 0023). */
export const REPORT_REASONS: readonly { readonly value: ReportReason; readonly label: string }[] = [
  { value: 'fake', label: 'Not a real listing' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'scam', label: 'A scam' },
  { value: 'other', label: 'Something else' },
];

/** What the dialog shows: the form, or a report just sent. */
export type ReportDialogStep = 'form' | 'success';

/** Null once a reason is chosen (L2-021, criterion 7). */
export function validateReportReason(reason: ReportReason | null): string | null {
  return reason === null ? 'Choose a reason.' : null;
}

/** A note as it is sent and counted: cleaned like a message's text (ADR 0023). */
export function cleanReportNote(note: string): string {
  return cleanMessageText(note);
}

export function toReportRequest(reason: ReportReason, note: string): ReportListingRequest {
  return { reason, note: cleanReportNote(note) || null };
}

/** The dialog's title and the sentence under it (docs/mocks/dialogs/report-listing/). */
export function toReportDialogCopy(
  step: ReportDialogStep,
  posterFirstName: string,
): { readonly title: string; readonly description: string } {
  switch (step) {
    case 'form':
      return {
        title: 'Report this listing',
        description: `An admin will look at it. ${posterFirstName} is never told who reported.`,
      };
    case 'success':
      return {
        title: 'Thanks. Your report was sent.',
        description: 'An admin will look at this listing. You don’t need to do anything else.',
      };
  }
}
