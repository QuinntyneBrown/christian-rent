/** The fields of the message box that can be invalid, in the order it shows them. */
export type MessageField = 'startDate' | 'endDate' | 'text';

/** The alert above the form after a send that failed or met the messaging limit. */
export interface MessageAlertView {
  readonly tone: 'danger' | 'warning';
  readonly title: string;
  readonly text: string;
}

/**
 * The form of the message box as `cr-message-box` draws it (send-message design), every word
 * already written. `@rent/domain` makes one from the draft, its errors and where sending stands.
 */
export interface MessageFormView {
  /** A wanted listing: the button's colour, and no dates. */
  readonly wanted: boolean;
  /** "Message Dan", "Offer to help Marcus" or "Try again". */
  readonly submit: string;
  /** The message is being sent: the button is busy and the fields are read-only. */
  readonly busy: boolean;
  /** The messaging limit holds: the button is off. */
  readonly off: boolean;
  readonly alert: MessageAlertView | null;
  /** "2 things need fixing before this can be sent."; null when nothing does. */
  readonly summaryTitle: string | null;
  readonly summary: readonly { readonly field: MessageField; readonly text: string }[];
  readonly startError: string | null;
  readonly endError: string | null;
  readonly textError: string | null;
  /** "Sat, Jun 13, 2026 · one day"; null without two valid dates. */
  readonly datesInWords: string | null;
  /** The earliest start date, today, as an ISO date. */
  readonly today: string;
  /** "94 / 1,000". */
  readonly counter: string;
}

/** The confirmation that replaces the form once the message is sent. */
export interface MessageSentView {
  /** "Sent to Dan". */
  readonly title: string;
  readonly text: string;
  /** The dates, if any, and the message in quotation marks, as text. */
  readonly quote: string;
}
