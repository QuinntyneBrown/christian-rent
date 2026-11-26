import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { QueueItemView, ReviewKind } from '@rent/api';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag, type TagVariant } from '../tag/tag';

/**
 * One row of the review queue (docs/design-system/components/queue-item.html): what waits, who
 * it is from and for how long, and its kind in words. Where an item can be opened it is a
 * button, and the open one is `aria-current`; elsewhere it is plain text. A long title is cut
 * with an ellipsis and keeps its full text. With no item it is a skeleton row.
 */
@Component({
  selector: 'cr-queue-item',
  imports: [Icon, NgTemplateOutlet, Skeleton, Tag],
  templateUrl: './queue-item.html',
  styleUrl: './queue-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueItem {
  readonly item = input.required<QueueItemView | null>();
  readonly selectable = input(false);
  readonly current = input(false);
  /** The admin chose this item: its identifier. */
  readonly chosen = output<string>();

  protected readonly tags: Record<ReviewKind, TagVariant> = {
    'new-listing': 'new',
    report: 'reported',
    'new-member': 'new-member',
  };
}
