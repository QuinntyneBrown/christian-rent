import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SESSION } from '@rent/api';
import { AdminLayout, AdminNav, Queue } from '@rent/components';

/**
 * Admin (view-review-queue design): the review queue and, from 768 px, the detail panel beside
 * it. Its route is matched only for an admin (ADR 0024).
 */
@Component({
  selector: 'cr-review-page',
  imports: [AdminLayout, AdminNav, Queue],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  private readonly member = inject(SESSION).member;

  protected readonly name = computed(() => this.member()?.name ?? '');
  protected readonly headingId = 'queue-title';
}
