import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

/**
 * The first thing the Tab key reaches: a link past the header to the content (L2-032,
 * criterion 8). It moves focus itself, because a bare "#main" would resolve against <base href>
 * and leave the current route.
 */
@Component({
  selector: 'cr-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  /** The id of the element that holds the content; it carries tabindex="-1". */
  readonly target = input('main');

  private readonly document = inject(DOCUMENT);

  protected skip(event: Event): void {
    const content = this.document.getElementById(this.target());
    if (!content) {
      return;
    }
    event.preventDefault();
    content.focus();
    content.scrollIntoView({ block: 'start' });
  }
}
