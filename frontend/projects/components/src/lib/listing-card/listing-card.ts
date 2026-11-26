import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ListingCardView } from '@rent/api';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';

/**
 * One listing on Browse (docs/design-system/components/listing-card.html): a link to the
 * listing. A listing for rent leads with its first photo, sized to the 4:3 box and reserved
 * before it loads, or the "No photo yet" placeholder; a wanted listing has no photo, so its title
 * is the picture, white on blue, with when it is needed (L2-001). Without a card it is the
 * skeleton in the card's shape (L2-033, criterion 1). Every word is rendered as text. A card
 * with no address is a preview and a plain block, not a link; `heading` says whether its title
 * is an `h2` (on Browse and in a confirmation) or a paragraph (Post's preview; ADR 0019).
 */
@Component({
  selector: 'cr-listing-card',
  imports: [Icon, NgOptimizedImage, NgTemplateOutlet, RouterLink, Skeleton, Tag],
  templateUrl: './listing-card.html',
  styleUrl: './listing-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingCard {
  /** The card to draw, or null for its skeleton. */
  readonly card = input.required<ListingCardView | null>();
  /** Loads the photo first and eagerly: for the cards of the first row (L2-029, criterion 3). */
  readonly priority = input(false);
  readonly heading = input(true);
}
