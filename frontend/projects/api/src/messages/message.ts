/**
 * A message as it is being written in the message box (send-message design): its text as
 * typed, and its dates as ISO dates (YYYY-MM-DD) or empty.
 */
export interface MessageDraft {
  readonly text: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** What `POST /api/listings/{listingId}/messages` takes: the text, and both dates or neither. */
export interface SendMessageRequest {
  readonly text: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
}

/** What it answers: that the message exists, never its text (ADR 0022). */
export interface SentMessage {
  readonly id: string;
  /** When it was sent, as an ISO instant. */
  readonly sentAt: string;
}
