import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ListingView } from '@rent/api';
import { Gallery } from '../gallery/gallery';
import { Icon } from '../icon/icon';
import { Poster } from '../poster/poster';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';
import { WantedPanel } from '../wanted-panel/wanted-panel';

/**
 * One listing on the Listing screen (read-listing design): a listing for rent leads with its
 * photos, a wanted one with the blue panel; then its kind, its title as the screen's heading,
 * where, when and how long ago it was posted, its note, and who posted it (L2-007, L2-008).
 * There is no calendar and nothing to book: "when" is a line of text (L2-024). Without a
 * listing it is the skeleton in the listing's shape (L2-033, criterion 1). Every word is
 * rendered as text (L2-026).
 */
@Component({
  selector: 'cr-listing',
  imports: [Gallery, Icon, Poster, Skeleton, Tag, WantedPanel],
  templateUrl: './listing.html',
  styleUrl: './listing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Listing {
  /** The listing to draw, or null for its skeleton. */
  readonly listing = input.required<ListingView | null>();
}
