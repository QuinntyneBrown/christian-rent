import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Icon } from '../icon/icon';
import { Toast, type ToastTone } from './toast';

function render(tone: ToastTone, actionLabel: string | null = null) {
  const fixture = TestBed.createComponent(Toast);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('title', 'Approved');
  fixture.componentRef.setInput(
    'text',
    '“Backyard garden for gatherings” is now public on Browse.',
  );
  fixture.componentRef.setInput('actionLabel', actionLabel);
  fixture.detectChanges();
  return fixture;
}

describe('Toast', () => {
  // docs/design-system/components/toast.html: the icon says the tone along with the title.
  it.each([
    ['info', 'info', 'status'],
    ['success', 'check-circle', 'status'],
    ['warning', 'alert', 'alert'],
    ['danger', 'x-circle', 'alert'],
  ] as const)('a %s toast shows the %s icon and the role %s', (tone, icon, role) => {
    const fixture = render(tone);
    const element = fixture.nativeElement as HTMLElement;
    const toast = element.querySelector('.toast');

    expect(toast?.classList).toContain(`toast--${tone}`);
    expect(toast?.getAttribute('role')).toBe(role);
    const icons = fixture.debugElement.queryAll(By.directive(Icon));
    expect(icons.map((node) => (node.componentInstance as Icon).name())).toEqual([icon, 'x']);
  });

  it('shows its title and text as text', () => {
    const element = render('success').nativeElement as HTMLElement;

    expect(element.querySelector('.toast__title')?.textContent).toBe('Approved');
    expect(element.querySelector('.toast__text')?.textContent).toBe(
      '“Backyard garden for gatherings” is now public on Browse.',
    );
  });

  it('offers its one action, and Dismiss', () => {
    const fixture = render('danger', 'Try again');
    const element = fixture.nativeElement as HTMLElement;
    const actions: string[] = [];
    fixture.componentInstance.action.subscribe(() => actions.push('action'));
    fixture.componentInstance.dismissed.subscribe(() => actions.push('dismissed'));

    element.querySelector<HTMLButtonElement>('.toast__action')?.click();
    element.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')?.click();

    expect(actions).toEqual(['action', 'dismissed']);
  });

  // A toast that dismisses itself draws the time it has left, which stops while paused.
  it('draws its time only when it dismisses itself, and stops it while paused', () => {
    const fixture = render('success');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.toast__progress')).toBeNull();

    fixture.componentRef.setInput('timed', true);
    fixture.detectChanges();
    const progress = element.querySelector('.toast__progress');
    expect(progress?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.toast')?.classList).not.toContain('toast--paused');

    fixture.componentRef.setInput('paused', true);
    fixture.detectChanges();
    expect(element.querySelector('.toast')?.classList).toContain('toast--paused');
  });

  it('has no action button without an action', () => {
    expect(
      (render('info').nativeElement as HTMLElement).querySelector('.toast__action'),
    ).toBeNull();
  });
});
