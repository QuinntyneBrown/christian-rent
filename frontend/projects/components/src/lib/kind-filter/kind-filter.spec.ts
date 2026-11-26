import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KindFilter, type KindChoice } from './kind-filter';

@Component({
  imports: [KindFilter],
  template: `<cr-kind-filter [kind]="kind()" (kindChange)="changes.push($event)" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly kind = signal<KindChoice>('all');
  readonly changes: KindChoice[] = [];
}

// docs/design-system/components/kind-filter.html; L2-035 criteria 1 and 4.
describe('KindFilter', () => {
  function render(kind: KindChoice) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.kind.set(kind);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    return { host: fixture.componentInstance, element, buttons };
  }

  it('is a group named Kind of three toggle buttons', () => {
    const { element, buttons } = render('all');
    const group = element.querySelector('.kind-filter');

    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Kind');
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'All',
      'Spaces',
      'Things',
    ]);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
  });

  it.each([
    ['all', ['true', 'false', 'false']],
    ['space', ['false', 'true', 'false']],
    ['thing', ['false', 'false', 'true']],
  ] as const)('presses exactly the %s option', (kind, pressed) => {
    const { buttons } = render(kind);

    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(pressed);
  });

  it('emits the kind of the option pressed', () => {
    const { host, buttons } = render('all');

    buttons[1]!.click();
    buttons[2]!.click();
    buttons[0]!.click();

    expect(host.changes).toEqual(['space', 'thing', 'all']);
  });
});
