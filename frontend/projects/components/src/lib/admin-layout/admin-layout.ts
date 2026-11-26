import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Admin's frame (docs/design-system/components/admin-nav.html and queue-item.html, the `admin`
 * block): the navigation, the queue and, from 768 px, the detail panel beside it (L2-031,
 * criterion 5). Under 768 px the detail panel is not shown at all.
 */
@Component({
  selector: 'cr-admin-layout',
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  /** The id of the queue's heading, which names the queue's region. */
  readonly queueHeadingId = input.required<string>();
  /** True while the screen waits for the queue (L2-033, criterion 1). */
  readonly busy = input(false);
}
