import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Admin's screen (docs/design-system/components/layout.html, the admin block): the rail, the
 * queue and the detail panel, which exists from 768 px up. It is the screen's main landmark.
 * Slots: `nav`, `queue` and `detail`. The queue is named by `cr-queue-header`'s heading.
 */
@Component({
  selector: 'cr-admin-layout',
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  readonly detailBusy = input(false);
}
