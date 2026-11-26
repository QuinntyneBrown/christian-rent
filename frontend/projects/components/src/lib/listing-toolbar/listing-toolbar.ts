import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BackLink } from '../back-link/back-link';

/**
 * The row above a listing (read-listing design): "All listings", which leads back to Browse
 * (L2-007, criterion 8), and on the right whatever the consumer projects, such as Report.
 */
@Component({
  selector: 'cr-listing-toolbar',
  imports: [BackLink],
  templateUrl: './listing-toolbar.html',
  styleUrl: './listing-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingToolbar {}
