import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PricePeriod } from '@rent/api';
import {
  Alert,
  Button,
  Confirmation,
  DateRange,
  FieldRow,
  Icon,
  LineField,
  ListingCard,
  PhotoPicker,
  PostLayout,
  Sentence,
  Textarea,
  type WordOption,
} from '@rent/components';
import {
  DRAFT_LIMITS,
  type DraftField,
  formatRetryAt,
  photoProblemText,
  summaryTitle,
} from '@rent/domain';
import { PhotoUploads } from './photo-uploads';
import { PostStore } from './post-store';

/** The id of each field's input, which the summary's links move focus to. */
const FIELD_IDS: Record<DraftField, string> = {
  title: 'post-title',
  price: 'post-price',
  whenText: 'post-when',
  startDate: 'post-dates-start',
  endDate: 'post-dates-end',
  area: 'post-area',
  note: 'post-note',
};

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
 * header is the plain one, with a close button and no Post (L2-036, criterion 3). A submission
 * with invalid fields marks them all, and focus moves to the summary, whose links move focus to
 * their fields (L2-010, criterion 8).
 */
import { RentHeader } from '../../shell/rent-header';

@Component({
  selector: 'cr-post-page',
  imports: [
    RentHeader,
    Alert,
    Button,
    Confirmation,
    DateRange,
    FieldRow,
    Icon,
    LineField,
    ListingCard,
    PhotoPicker,
    PostLayout,
    RouterLink,
    Sentence,
    Textarea,
  ],
  providers: [PostStore, PhotoUploads],
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
  protected readonly uploads = inject(PhotoUploads);
  protected readonly periods = PERIODS;
  protected readonly limits = DRAFT_LIMITS;
  protected readonly fieldIds = FIELD_IDS;
  protected readonly summaryTitle = summaryTitle;

  /** What the limited state says, with when posting reopens in words (ADR 0019). */
  protected readonly limitText = computed(() => {
    const when = formatRetryAt(this.store.retryAt(), new Date());
    return `You can post again ${when}${when.endsWith('.') ? '' : '.'} Everything you entered is still here.`;
  });

  /** What the photos field says about the last file that was not added (ADR 0021). */
  protected readonly photoProblem = computed(() => {
    const problem = this.uploads.problem();
    return problem ? photoProblemText(problem) : null;
  });

  private readonly summary = viewChild(Alert);
  private readonly confirmation = viewChild(Confirmation);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const offer = this.offer();
      const title = this.title();
      untracked(() => this.store.arrive(offer, title));
    });
    afterNextRender(() => void this.store.enter());
  }

  protected async submitted(): Promise<void> {
    if (this.store.submitState() === 'submitting') {
      return;
    }
    if (!this.store.check()) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    // The photos that are in are posted; any still on their way is cancelled (ADR 0021).
    this.uploads.cancelAll();
    await this.store.publish();
    if (this.store.submitState() === 'sent') {
      afterNextRender(() => this.confirmation()?.focus(), { injector: this.injector });
    }
  }

  protected startAnother(): void {
    this.store.startAnother();
    afterNextRender(() => this.document.querySelector<HTMLElement>('main h1')?.focus(), {
      injector: this.injector,
    });
  }

  /** A summary link moves focus to its field, without changing the address. */
  protected focusField(event: Event, field: DraftField): void {
    event.preventDefault();
    this.document.getElementById(FIELD_IDS[field])?.focus();
  }

  protected periodChosen(period: string): void {
    this.store.patch({ pricePeriod: period as PricePeriod });
  }
}
