import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { QueueItemView } from '@rent/api';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag, type TagVariant } from '../tag/tag';

/**
 * One thing waiting in the review queue (docs/design-system/components/queue-item.html): a link
 * that opens it in the detail panel, `/admin?item={id}` (ADR 0024). Its name reads the title,
 * who it is from, how long it has waited and its kind in words; a cut title keeps its full text.
 */
@Component({
  selector: 'cr-queue-item',
  imports: [Icon, RouterLink, Skeleton, Tag],
  templateUrl: './queue-item.html',
  styleUrl: './queue-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueItem {
  /** The item; null draws a row in its shape while the queue loads (L2-033, criterion 1). */
  readonly item = input.required<QueueItemView | null>();
  /** True for the item the detail panel shows. */
  readonly current = input(false);

  protected readonly tagVariant = computed<TagVariant>(
    () => TAGS[this.item()?.kind ?? 'new-listing'],
  );
  protected readonly photo = computed(() => {
    const thumb = this.item()?.thumb;
    return thumb?.kind === 'photo' ? thumb.url : null;
  });
  protected readonly initials = computed(() => {
    const thumb = this.item()?.thumb;
    return thumb?.kind === 'member' ? thumb.initials : null;
  });
}

const TAGS: Record<QueueItemView['kind'], TagVariant> = {
  'new-listing': 'new',
  report: 'reported',
  'new-member': 'new-member',
};
