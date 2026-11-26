import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The design system's Button, on a native <a> or <button> so it keeps its own semantics. The
 * host carries the mocks' classes (btn, btn--primary, btn--sm, btn--icon), which e2e locators use.
 * Journeys add the variants their mocks need (rent, wanted, success, danger...).
 */
@Component({
  selector: 'a[cr-button], button[cr-button]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--icon]': 'iconOnly()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  /** A square button holding only an icon; it must then have an aria-label. */
  readonly iconOnly = input(false);
}
