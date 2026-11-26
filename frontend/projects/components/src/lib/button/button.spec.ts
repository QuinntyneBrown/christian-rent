import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button, type ButtonSize, type ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `<button
    cr-button
    type="button"
    [variant]="variant()"
    [size]="size()"
    [block]="block()"
    [iconOnly]="iconOnly()"
    [busy]="busy()"
    (click)="presses.set(presses() + 1)"
  >
    Publish listing
  </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly variant = signal<ButtonVariant>('secondary');
  readonly size = signal<ButtonSize>('md');
  readonly block = signal(false);
  readonly iconOnly = signal(false);
  readonly busy = signal(false);
  readonly presses = signal(0);
}

function render(change: (host: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
  change(fixture.componentInstance);
  fixture.detectChanges();
  const button = (fixture.nativeElement as HTMLElement).querySelector('button');
  if (!button) {
    throw new Error('no button');
  }
  return { fixture, button };
}

describe('Button', () => {
  // docs/design-system/components/button.html, Variants: one case per row.
  it.each([
    ['rent', 'btn--rent'],
    ['wanted', 'btn--wanted'],
    ['primary', 'btn--primary'],
    ['success', 'btn--success'],
    ['danger', 'btn--danger'],
    ['outline', 'btn--outline'],
    ['danger-quiet', 'btn--danger-quiet'],
    ['ghost', 'btn--ghost'],
    ['link', 'btn--link'],
  ] as const)('the %s variant is the btn block with %s', (variant, modifier) => {
    const { button } = render((host) => host.variant.set(variant));

    expect([...button.classList]).toEqual(['btn', modifier]);
  });

  it('the secondary variant is the plain btn block', () => {
    expect([...render().button.classList]).toEqual(['btn']);
  });

  // Sizes: 44, 48 and 56 px.
  it.each([
    ['sm', ['btn', 'btn--sm']],
    ['md', ['btn']],
    ['lg', ['btn', 'btn--lg']],
  ] as const)('the %s size', (size, classes) => {
    expect([...render((host) => host.size.set(size)).button.classList]).toEqual(classes);
  });

  it('can fill its row, or hold only an icon', () => {
    expect(render((host) => host.block.set(true)).button.classList).toContain('btn--block');
    expect(render((host) => host.iconOnly.set(true)).button.classList).toContain('btn--icon');
  });

  it('is pressable when not busy', () => {
    const { fixture, button } = render();

    button.click();

    expect(fixture.componentInstance.presses()).toBe(1);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  // States: busy hides the label behind a spinner and ignores further presses, so nothing is
  // ever sent twice.
  it('when busy says so and ignores presses, by pointer or keyboard', () => {
    const { fixture, button } = render((host) => host.busy.set(true));

    button.click();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(fixture.componentInstance.presses()).toBe(0);
  });
});
