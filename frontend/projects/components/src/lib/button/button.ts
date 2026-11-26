import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/**
 * The colour says what kind of thing a button does (docs/design-system/components/button.html):
 * for rent, wanted, primary, success and danger fill; the rest are quieter. Secondary is the plain
 * button.
 */
export type ButtonVariant =
  | 'rent'
  | 'wanted'
  | 'primary'
  | 'success'
  | 'danger'
  | 'outline'
  | 'secondary'
  | 'danger-quiet'
  | 'ghost'
  | 'link';

/** 44, 48 or 56 px tall. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The design system's Button, on a native <a> or <button> so it keeps its own semantics. The
 * host carries the mocks' classes (btn, btn--rent, btn--sm, ...), which e2e locators use.
 * Disabled is the native attribute. Busy keeps the width, hides the label behind a spinner and
 * ignores further presses, so a listing or a message is never sent twice.
 */
@Component({
  selector: 'a[cr-button], button[cr-button]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--rent]': "variant() === 'rent'",
    '[class.btn--wanted]': "variant() === 'wanted'",
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--success]': "variant() === 'success'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--outline]': "variant() === 'outline'",
    '[class.btn--danger-quiet]': "variant() === 'danger-quiet'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--link]': "variant() === 'link'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--block]': 'block()',
    '[class.btn--icon]': 'iconOnly()',
    '[attr.aria-busy]': "busy() ? 'true' : null",
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  /** Fills its row, as in a dialog footer on a phone. */
  readonly block = input(false);
  /** Holds only an icon; it must then have an aria-label. */
  readonly iconOnly = input(false);
  readonly busy = input(false);

  constructor() {
    // A capture listener on the host runs before any (click) the consumer binds, so a busy
    // button swallows the press. It is removed when the button is destroyed.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const ignoreWhileBusy = (event: Event) => {
      if (this.busy()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    host.addEventListener('click', ignoreWhileBusy, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      host.removeEventListener('click', ignoreWhileBusy, { capture: true }),
    );
  }
}
