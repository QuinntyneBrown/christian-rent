import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The Listing screen's two columns (docs/design-system/foundations/layout.html): the listing,
 * and the aside the consumer projects with `slot="aside"`, which sits under the listing below
 * 768 px and to its right, sticky, from 768 px (L2-031, criterion 3). The aside's column is kept
 * whatever it holds, so the listing has the same width in every state.
 */
@Component({
  selector: 'cr-listing-layout',
  templateUrl: './listing-layout.html',
  styleUrl: './listing-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingLayout {}
