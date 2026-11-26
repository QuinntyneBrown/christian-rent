import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * What replaces a finished form (docs/design-system/components/confirmation.html): a badge in
 * the colour of what was posted, the title, what happens next, the consumer's card and its
 * actions (`slot="actions"`). It is a live region, so a screen reader announces it (L2-032,
 * criterion 4), and its title is the screen's `h1`, which `focus()` moves focus to.
 */
@Component({
  selector: 'cr-confirmation',
  imports: [Icon],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Confirmation {
  readonly tone = input<'rent' | 'wanted'>('rent');
  readonly title = input.required<string>();
  readonly text = input.required<string>();

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  focus(): void {
    this.heading().nativeElement.focus();
  }
}
