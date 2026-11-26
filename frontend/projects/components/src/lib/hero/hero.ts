import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * Browse's headline (docs/design-system/components/hero.html): the screen's heading with its
 * accent line in the display orange, the lead, and the buttons that lead to posting, which the
 * consumer projects. From 992 px the buttons sit to the right of the text.
 */
@Component({
  selector: 'cr-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  readonly title = input.required<string>();
  readonly accent = input.required<string>();
  readonly lead = input<string | null>(null);

  protected readonly titleId = `hero-title-${nextId++}`;
}
