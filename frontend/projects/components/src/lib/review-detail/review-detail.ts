import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReviewDecision, ReviewDetailView } from '@rent/api';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';
import { Verified } from '../verified/verified';

/**
 * Everything needed to decide on the selected item (docs/design-system/components/
 * review-detail.html): a listing with its photos, who posted it and since when, a reported
 * one with what the report says over it, or a new member, over the bar that decides it. With
 * no item it is a skeleton.
 */
@Component({
  selector: 'cr-review-detail',
  imports: [Avatar, Button, Icon, RouterLink, Skeleton, Tag, Verified],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  readonly view = input.required<ReviewDetailView | null>();
  /** The decision on this item that is in flight: its button is busy. */
  readonly deciding = input<ReviewDecision | null>(null);
  /** No decision can be started, as while one is in flight (L2-020, criterion 16). */
  readonly off = input(false);

  readonly decide = output<ReviewDecision>();
}
