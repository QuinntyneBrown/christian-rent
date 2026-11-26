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

  // L2-010 criterion 8: a form's summary lists the consumer's links and takes focus.
  it('is a focusable summary that holds the links given to it', () => {
    const fixture = render('danger', true);
    fixture.componentRef.setInput('summary', true);
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.alert')!;

    expect(alert.classList).toContain('form-summary');
    expect(alert.getAttribute('tabindex')).toBe('-1');
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(alert);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('takes no focus when it is not a summary', () => {
    expect(
      render('danger').nativeElement.querySelector('.alert').getAttribute('tabindex'),
    ).toBeNull();
  });
});
