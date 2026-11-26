/**
 * A card as `cr-listing-card` draws it: every word already written in the product's terms
 * (L2-022). `@rent/domain` makes one from a `ListingCard`, and Post's preview from a draft.
 */
export interface ListingCardView {
  /** Where selecting the card leads (L2-001, criterion 5); null for a preview, which is no link. */
  readonly href: string | null;
  /** True while the title is a placeholder, which mutes the title and the price (ADR 0019). */
  readonly placeholder?: boolean;
  readonly wanted: boolean;
  /** "space", or "Wanted · space". */
  readonly tag: string;
  readonly title: string;
  /** "$45" and "/ hour"; "Free" and null; null when a wanted listing gives no price. */
  readonly price: { readonly amount: string; readonly per: string | null } | null;
  /** The area, and its distance when known: "Langley · 3 km". */
  readonly place: string;
  readonly church: string;
  /** On a wanted card: who is asking, and when it is needed. */
  readonly poster: string | null;
  readonly when: string | null;
  /** On a card for rent: its first photo, or null for the "No photo yet" placeholder. */
  readonly photo: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  } | null;
}
