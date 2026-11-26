import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ListingKind, ListingOffer } from '@rent/api';
import { WordToggle, type WordOption } from '../word-toggle/word-toggle';

const SIDES: readonly WordOption[] = [
  { value: 'have', label: 'have' },
  { value: 'need', label: 'need' },
];

const KINDS: readonly WordOption[] = [
  { value: 'space', label: 'a space' },
  { value: 'thing', label: 'a thing' },
];

/**
 * Post's heading, one sentence: "I have / need a space / a thing to rent out."
 * (docs/design-system/components/word-toggle.html; L2-009). "have" is a listing for rent and
 * ends "to rent out."; "need" is a wanted listing and ends "to rent." (criterion 5). It is the
 * screen's `h1`, which takes focus when Post is opened from another screen.
 */
@Component({
  selector: 'cr-sentence',
  imports: [WordToggle],
  templateUrl: './sentence.html',
  styleUrl: './sentence.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sentence {
  readonly offer = input.required<ListingOffer>();
  readonly kind = input.required<ListingKind>();
  readonly disabled = input(false);
  readonly offerChange = output<ListingOffer>();
  readonly kindChange = output<ListingKind>();

  protected readonly sides = SIDES;
  protected readonly kinds = KINDS;
  protected readonly side = computed(() => (this.offer() === 'wanted' ? 'need' : 'have'));
  protected readonly ending = computed(() =>
    this.offer() === 'wanted' ? 'to rent.' : 'to rent out.',
  );

  protected sideChosen(side: string): void {
    this.offerChange.emit(side === 'need' ? 'wanted' : 'for-rent');
  }

  protected kindChosen(kind: string): void {
    this.kindChange.emit(kind === 'space' ? 'space' : 'thing');
  }
}
