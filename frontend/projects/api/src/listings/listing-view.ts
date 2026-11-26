/** One of the avatar's three pale tints (docs/design-system/components/avatar.html). */
export type AvatarTint = 'sun' | 'sky' | 'leaf';

/** A photo as `cr-gallery` draws it. */
export interface GalleryPhotoView {
  readonly url: string;
  readonly thumbUrl: string;
  readonly width: number;
  readonly height: number;
  /** The large photo's text alternative, which says what it shows. */
  readonly alt: string;
}

/** Who posted a listing, as `cr-poster` draws it. */
export interface PosterView {
  readonly name: string;
  /** "DW"; decoration beside the name. */
  readonly initials: string;
  readonly tint: AvatarTint;
  readonly isVerified: boolean;
  readonly church: string;
  readonly churchIsVerified: boolean;
  /** "Member since 2023". */
  readonly since: string;
}

/** The head of the message box: "Rent for", "$45", "CAD / hour" (L2-022, criterion 9). */
export interface MessagePriceView {
  readonly eyebrow: string;
  readonly amount: string;
  /** "CAD / hour"; null for "Free". */
  readonly unit: string | null;
}

/**
 * A listing as the Listing screen draws it (read-listing design): every word already written in
 * the product's terms (L2-022). `@rent/domain` makes one from a `ListingDetail`.
 */
export interface ListingView {
  readonly wanted: boolean;
  /** "For rent · space", "Wanted · thing". */
  readonly tag: string;
  readonly title: string;
  /** A listing for rent's photos; empty for a wanted listing, or one posted without a photo. */
  readonly photos: readonly GalleryPhotoView[];
  /** The area, and its distance when known: "Langley · 3 km". */
  readonly place: string;
  readonly when: string | null;
  /** "Posted 2 days ago". */
  readonly posted: string;
  readonly note: string | null;
  readonly poster: PosterView;
  /** "Message Dan about this listing", "Offer to help Marcus about this listing". */
  readonly messageHeading: string;
  /** Null for a wanted listing that gave no price. */
  readonly price: MessagePriceView | null;
}
