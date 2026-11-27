import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ReviewDecision, ReviewDetailView } from '@rent/api';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { DecisionBar } from '../decision-bar/decision-bar';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Tag } from '../tag/tag';
import { Verified } from '../verified/verified';

/**
 * The selected item in Admin's detail panel (docs/design-system/components/review-detail.html):
 * a listing with its photo, or its title on blue when wanted, and a report's reason above it; or
 * a new member, with their church and what they have done. Null draws it in its shape while it
 * loads (L2-033, criterion 1). What a member wrote is text, never HTML (L2-026). Under it, the
 * decisions its kind allows (L2-020, criterion 8); a warning, such as "This was already decided.",
 * is projected above it with `slot="notice"`.
 */
@Component({
  selector: 'cr-review-detail',
  imports: [Avatar, Button, DecisionBar, Icon, NgTemplateOutlet, Skeleton, Tag, Verified],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  readonly view = input.required<ReviewDetailView | null>();
  /** The decision being sent: its button is busy and the others do nothing. */
  readonly deciding = input<ReviewDecision | null>(null);
  /** Another admin decided first: every decision is off (L2-020, criterion 13). */
  readonly decided = input(false);

  /** A decision button was pressed. */
  readonly decide = output<ReviewDecision>();

  protected choose(decision: ReviewDecision): void {
    if (this.deciding() === null) {
      this.decide.emit(decision);
    }
  }
}
