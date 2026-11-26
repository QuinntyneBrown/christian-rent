import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterRenderEffect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/** The longest term the field takes (L2-003, criterion 4). */
export const SEARCH_TERM_MAX_LENGTH = 100;

/**
 * Browse's search (docs/design-system/components/search-bar.html): a field named "Search
 * listings" that takes at most 100 characters, the area as text, and Search (L2-003, criteria 6
 * and 7). It emits `termChange` as the person types and `submitted` on Enter or Search; Escape
 * empties the field. The term it is given is written into the field only while the field does
 * not have focus, so an answer to an earlier keystroke never overwrites what is being typed.
 * Until a person's area can be set, `distanceKm` is null and the area shows alone (ADR 0012).
 */
@Component({
  selector: 'cr-search-bar',
  imports: [Button, Icon],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  readonly term = input('');
  readonly area = input.required<string>();
  readonly distanceKm = input<number | null>(null);
  /** The term as typed, at each change. */
  readonly termChange = output<string>();
  /** The term as typed, on Enter or Search. */
  readonly submitted = output<string>();

  protected readonly maxLength = SEARCH_TERM_MAX_LENGTH;
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    afterRenderEffect(() => {
      const term = this.term();
      const field = this.field().nativeElement;
      if (field.value !== term && field.ownerDocument.activeElement !== field) {
        field.value = term;
      }
    });
  }

  protected changed(): void {
    this.termChange.emit(this.field().nativeElement.value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit(this.field().nativeElement.value);
  }

  protected clear(event: Event): void {
    const field = this.field().nativeElement;
    if (field.value === '') {
      return;
    }
    event.preventDefault();
    field.value = '';
    this.termChange.emit('');
  }
}
