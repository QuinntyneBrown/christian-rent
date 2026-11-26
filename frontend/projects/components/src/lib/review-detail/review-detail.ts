import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReviewDetailView } from '@rent/api';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';
import { Verified } from '../verified/verified';

/**
 * Everything needed to decide on the selected item (docs/design-system/components/
 * review-detail.html): a listing with its photos, who posted it and since when, a reported
 * one with what the report says over it, or a new member. With no item it is a skeleton.
 */
@Component({
  selector: 'cr-review-detail',
  imports: [Avatar, Icon, RouterLink, Skeleton, Tag, Verified],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  readonly view = input.required<ReviewDetailView | null>();
}
