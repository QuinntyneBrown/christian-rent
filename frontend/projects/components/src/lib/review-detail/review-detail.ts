import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReviewDetailView } from '@rent/api';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';
import { Verified } from '../verified/verified';

/**
 * The selected item in Admin's detail panel (docs/design-system/components/review-detail.html):
 * a listing with its photo, or its title on blue when wanted, and a report's reason above it; or
 * a new member, with their church and what they have done. Null draws it in its shape while it
 * loads (L2-033, criterion 1). What a member wrote is text, never HTML (L2-026).
 */
@Component({
  selector: 'cr-review-detail',
  imports: [Avatar, Icon, NgTemplateOutlet, RouterLink, Skeleton, Tag, Verified],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  readonly view = input.required<ReviewDetailView | null>();
}
