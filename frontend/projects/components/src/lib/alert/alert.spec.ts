import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Icon } from '../icon/icon';
import { Alert, type AlertTone } from './alert';

function render(tone: AlertTone, announce = false, text: string | null = null) {
  const fixture = TestBed.createComponent(Alert);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('title', 'You weren’t added.');
  fixture.componentRef.setInput('text', text);
  fixture.componentRef.setInput('announce', announce);
  fixture.detectChanges();
  return fixture;
}

describe('Alert', () => {
  // docs/design-system/components/alert.html: the icon carries the tone with the title.
  it.each([
    ['info', 'info', ''],
    ['success', 'check-circle', 'alert--success'],
    ['warning', 'alert', 'alert--warning'],
    ['danger', 'alert', 'alert--danger'],
  ] as const)('a %s alert shows the %s icon', (tone, icon, modifier) => {
    const fixture = render(tone);
    const alert = (fixture.nativeElement as HTMLElement).querySelector('.alert');

    expect(alert?.className.trim()).toBe(modifier ? `alert ${modifier}` : 'alert');
    expect(fixture.debugElement.query(By.directive(Icon)).componentInstance.name()).toBe(icon);
  });

  it('is announced only when asked', () => {
    expect(render('danger').nativeElement.querySelector('.alert').getAttribute('role')).toBeNull();
    expect(render('danger', true).nativeElement.querySelector('.alert').getAttribute('role')).toBe(
      'alert',
    );
  });

  it('shows its title and text as text', () => {
    const element = render('danger', false, '<b>What you entered</b> is still here.')
      .nativeElement as HTMLElement;

    expect(element.querySelector('.alert__title')?.textContent).toBe('You weren’t added.');
    expect(element.querySelector('.alert__text')?.textContent).toBe(
      '<b>What you entered</b> is still here.',
    );
  });
});
