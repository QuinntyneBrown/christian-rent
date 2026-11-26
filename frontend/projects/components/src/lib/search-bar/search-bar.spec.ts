import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchBar } from './search-bar';

@Component({
  imports: [SearchBar],
  template: `<cr-search-bar
    [term]="term()"
    area="Langley, BC"
    [distanceKm]="distanceKm()"
    (termChange)="changes.push($event)"
    (submitted)="submissions.push($event)"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly term = signal('');
  readonly distanceKm = signal<number | null>(null);
  readonly changes: string[] = [];
  readonly submissions: string[] = [];
}

// docs/design-system/components/search-bar.html; L2-003 criteria 3, 6 and 7.
describe('SearchBar', () => {
  function render(term = '') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.term.set(term);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    const field = element.querySelector<HTMLInputElement>('input.search-bar__input')!;
    return { fixture, host: fixture.componentInstance, element, field };
  }

  afterEach(() => document.body.replaceChildren());

  it('is a search with a field named Search listings that takes 100 characters, and Search', () => {
    const { element, field } = render();
    const form = element.querySelector('form.search-bar');

    expect(form?.getAttribute('role')).toBe('search');
    expect(field.type).toBe('search');
    expect(field.maxLength).toBe(100);
    expect(field.closest('label')?.textContent?.trim()).toBe('Search listings');
    expect(form?.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Search');
  });

  // L2-003 criterion 7; ADR 0012: the area alone until a distance is given.
  it('shows the area as text, and the distance once it is given', () => {
    const { fixture, element } = render();
    const near = () => element.querySelector('.search-bar__near')?.textContent?.trim();

    expect(near()).toBe('Langley, BC');

    fixture.componentInstance.distanceKm.set(25);
    fixture.detectChanges();

    expect(near()?.replace(/\s+/g, ' ')).toBe('Langley, BC · within 25 km');
  });

  it('emits the term as typed', () => {
    const { host, field } = render();

    field.value = 'park';
    field.dispatchEvent(new Event('input'));

    expect(host.changes).toEqual(['park']);
  });

  // L2-003 criterion 6: Enter or Search searches the term as typed.
  it('submits the term on Search', () => {
    const { host, element, field } = render();

    field.value = 'hall ';
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(host.submissions).toEqual(['hall ']);
  });

  it('empties the field on Escape', () => {
    const { host, field } = render();
    field.value = 'hall';

    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(field.value).toBe('');
    expect(host.changes).toEqual(['']);
  });

  // L2-002 criterion 5: a term from the address fills the field.
  it('shows the term it is given, and a later one, while the field is not in use', () => {
    const { fixture, field } = render('langley');
    expect(field.value).toBe('langley');

    fixture.componentInstance.term.set('');
    fixture.detectChanges();
    TestBed.tick();

    expect(field.value).toBe('');
  });

  it('never overwrites what is being typed with a term it is given', () => {
    const { fixture, field } = render();
    field.focus();
    field.value = 'parking';

    fixture.componentInstance.term.set('park');
    fixture.detectChanges();
    TestBed.tick();

    expect(field.value).toBe('parking');
  });
});
