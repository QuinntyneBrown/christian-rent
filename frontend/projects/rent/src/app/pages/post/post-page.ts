import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import type { PricePeriod } from '@rent/api';
import {
  Button,
  DateRange,
  FieldRow,
  LineField,
  PhotoPicker,
  PostLayout,
  Sentence,
  SiteHeader,
  Textarea,
  type WordOption,
} from '@rent/components';
import { DRAFT_LIMITS } from '@rent/domain';
import { PostStore } from './post-store';

const PERIODS: readonly WordOption[] = [
  { value: 'hour', label: 'per hour' },
  { value: 'day', label: 'per day' },
  { value: 'week', label: 'per week' },
  { value: 'month', label: 'per month' },
];

/**
 * Post, at `/post` (compose-listing and publish-listing designs): the sentence whose words
 * choose the offer and the kind, the fields, and the live preview beside them from 768 px
 * (L2-009, L2-010, L2-011, L2-031). Browse's `offer` and `title` set it (L2-004, L2-005). The
 * header is the plain one, with a close button and no Post (L2-036, criterion 3).
 */
@Component({
  selector: 'cr-post-page',
  imports: [
    Button,
    DateRange,
    FieldRow,
    LineField,
    PhotoPicker,
    PostLayout,
    Sentence,
    SiteHeader,
    Textarea,
  ],
  providers: [PostStore],
  templateUrl: './post-page.html',
  styleUrl: './post-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostPage {
  /** From the address: `for-rent` or `wanted`. */
  readonly offer = input<string>();
  /** From the address: the search a wanted listing asks for. */
  readonly title = input<string>();

  protected readonly store = inject(PostStore);
  protected readonly periods = PERIODS;
  protected readonly limits = DRAFT_LIMITS;

  constructor() {
    effect(() => {
      const offer = this.offer();
      const title = this.title();
      untracked(() => this.store.arrive(offer, title));
    });
  }

  protected periodChosen(period: string): void {
    this.store.patch({ pricePeriod: period as PricePeriod });
  }
}
