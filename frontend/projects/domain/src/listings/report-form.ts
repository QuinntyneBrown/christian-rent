import type { ReportListingRequest, ReportReason } from '@rent/api';
import { formatDay } from './format-when';
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

/** What the dialog shows: the form, a report just sent, or one sent before. */
export type ReportDialogStep = 'form' | 'success' | 'already';

/** Null once a reason is chosen (L2-021, criterion 7). */
export function validateReport(reason: ReportReason | null): string | null {
  return reason === null ? 'Choose a reason.' : null;
}

/** A note as it is sent and counted: cleaned like a message's text (ADR 0023). */
export function cleanReportNote(note: string): string {
  return cleanMessageText(note);
}

export function toReportRequest(reason: ReportReason, note: string): ReportListingRequest {
  return { reason, note: cleanReportNote(note) || null };
}

/** The day a report was filed, as the member's own browser dates it: "Jun 6, 2026". */
export function formatReportDate(reportedAt: string): string {
  const at = new Date(reportedAt);
  const two = (value: number) => String(value).padStart(2, '0');
  return formatDay(`${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`) ?? '';
}

/** The dialog's title and the sentence under it (docs/mocks/dialogs/report-listing/). */
export function toReportDialogCopy(
  step: ReportDialogStep,
  posterFirstName: string,
  reportedAt: string | null = null,
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
    case 'already':
      return {
        title: 'You’ve already reported this listing.',
        description: `Your report from ${formatReportDate(reportedAt ?? '')} is with an admin. There’s no need to send it again.`,
      };
  }
}
