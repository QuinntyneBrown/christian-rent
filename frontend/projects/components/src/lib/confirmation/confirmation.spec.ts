import { TestBed } from '@angular/core/testing';
import { Confirmation } from './confirmation';

// docs/design-system/components/confirmation.html; L2-012 criteria 2 and 9; L2-032 criterion 4.
describe('Confirmation', () => {
  function render(tone: 'rent' | 'wanted') {
    const fixture = TestBed.createComponent(Confirmation);
    fixture.componentRef.setInput('tone', tone);
    fixture.componentRef.setInput('title', 'Sent for review');
    fixture.componentRef.setInput('text', 'It isn’t public yet.');
    fixture.detectChanges();
    return fixture;
  }

  it('is an announced section with its badge, its title as the h1 and its text', () => {
    const element = render('wanted').nativeElement as HTMLElement;

    expect(element.querySelector('section.confirmation')?.getAttribute('role')).toBe('status');
    expect(element.querySelector('.success-badge')?.classList).toContain('success-badge--wanted');
    expect(element.querySelector('h1.confirmation__title')?.textContent).toBe('Sent for review');
    expect(element.querySelector('.confirmation__text')?.textContent).toBe('It isn’t public yet.');
  });

  it('moves focus to its title', () => {
    const fixture = render('rent');
    document.body.append(fixture.nativeElement as HTMLElement);

    fixture.componentInstance.focus();

    expect(document.activeElement?.textContent).toBe('Sent for review');
    (fixture.nativeElement as HTMLElement).remove();
  });
});
