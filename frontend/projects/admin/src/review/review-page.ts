import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Admin: the review queue (view-review-queue design). */
@Component({
  selector: 'cr-review-page',
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {}
