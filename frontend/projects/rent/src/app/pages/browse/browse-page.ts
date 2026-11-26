import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SESSION } from '@rent/api';
import { SiteHeader } from '@rent/components';

/**
 * Browse, the home screen. The scaffold renders its header and headline; journey 2 adds the
 * listings, the search bar and the switch.
 */
@Component({
  selector: 'cr-browse-page',
  imports: [SiteHeader],
  templateUrl: './browse-page.html',
  styleUrl: './browse-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowsePage {
  protected readonly member = inject(SESSION).member;
}
