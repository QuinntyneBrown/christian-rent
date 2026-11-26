import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The grid of cards on Browse (docs/design-system/components/listing-card.html, Lists of
 * listings): one column under 576 px, two from 576, three from 768 and four from 1200, with
 * wider gutters from 992 (L2-031, criterion 2). The consumer projects one `<li>` per card. While
 * it is busy, assistive technology hears that the list is loading.
 */
@Component({
  selector: 'cr-listing-grid',
  templateUrl: './listing-grid.html',
  styleUrl: './listing-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingGrid {
  readonly label = input('Listings');
  readonly busy = input(false);
}
