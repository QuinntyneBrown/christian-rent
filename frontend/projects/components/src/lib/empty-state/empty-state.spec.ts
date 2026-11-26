import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `<cr-empty-state [variant]="variant()" title="Nothing yet." text="Be the first.">
    <button type="button">Act</button>
  </cr-empty-state>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly variant = signal<'nothing' | 'error'>('nothing');
}

// docs/design-system/components/empty-state.html.
describe('EmptyState', () => {
  function render(variant: 'nothing' | 'error') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.variant.set(variant);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('says that nothing is there, named by its heading, with the ways forward', () => {
    const section = render('nothing').querySelector('section.no-results');
    const title = section?.querySelector('h2.no-results__title');

    expect(title?.textContent).toBe('Nothing yet.');
    expect(section?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(section?.querySelector('.no-results__text')?.textContent).toBe('Be the first.');
    expect(section?.querySelector('.no-results__actions button')?.textContent).toBe('Act');
  });

  it('says that nothing could be loaded, with its warning icon', () => {
    const section = render('error').querySelector('section.empty.empty--error');

    expect(section?.querySelector('.empty__icon cr-icon')).not.toBeNull();
    expect(section?.querySelector('h2.empty__title')?.textContent).toBe('Nothing yet.');
    expect(section?.querySelector('.empty__actions button')?.textContent).toBe('Act');
  });
});
