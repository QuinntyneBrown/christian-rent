import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Toast } from '../toast/toast';
import { ToastRegion } from './toast-region';

@Component({
  imports: [Toast, ToastRegion],
  template: `<cr-toast-region>
    <cr-toast title="Approved" />
    <cr-toast title="Removed" />
  </cr-toast-region>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

describe('ToastRegion', () => {
  it('is the one polite live region the toasts rise into, newest at the bottom', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const region = (fixture.nativeElement as HTMLElement).querySelector('.toast-region');

    expect(region?.getAttribute('role')).toBe('status');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(
      [...(region?.querySelectorAll('.toast__title') ?? [])].map((t) => t.textContent),
    ).toEqual(['Approved', 'Removed']);
  });
});
