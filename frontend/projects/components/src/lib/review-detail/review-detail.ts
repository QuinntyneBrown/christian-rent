import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ReviewDecision, ReviewDetailView } from '@rent/api';
import { Alert } from '../alert/alert';
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
  imports: [Alert, Avatar, Button, Icon, Skeleton, Tag, Verified],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  readonly view = input.required<ReviewDetailView | null>();
  /** The site's origin, where "View on site" leads (ADR 0028); without it the link is left out. */
  readonly siteUrl = input<string | null>(null);
  /** The decision on this item that is in flight: its button is busy. */
  readonly deciding = input<ReviewDecision | null>(null);
  /** No decision can be started, as while one is in flight (L2-020, criterion 16). */
  readonly off = input(false);
  /** What to say of this item when another decision came first (L2-020, criterion 13). */
  readonly conflict = input<{ readonly title: string; readonly text: string } | null>(null);

  readonly decide = output<ReviewDecision>();
  /** "Go to the next item", past the one decided first. */
  readonly next = output();
}
