import type { ReviewItemKind } from './review-item';

/** What a queue item shows on the left: the listing's photo, "Want", the member's initials, or no photo. */
export type QueueItemThumb =
  | { readonly kind: 'photo'; readonly url: string }
  | { readonly kind: 'wanted' }
  | { readonly kind: 'member'; readonly initials: string }
  | { readonly kind: 'no-photo' };

/**
 * One row of the review queue as `cr-queue-item` shows it (L2-019, criterion 6), formatted by
 * `@rent/domain`'s `toQueueItemView`.
 */
export interface QueueItemView {
  readonly id: string;
  readonly kind: ReviewItemKind;
  /** The listing's title or the member's name, as text. */
  readonly title: string;
  /** Who posted it or which church, and how long it has waited: "The Okafor family · 3 hr". */
  readonly meta: string;
  /** "New", "Reported" or "New member". */
  readonly tag: string;
  readonly thumb: QueueItemThumb;
}
