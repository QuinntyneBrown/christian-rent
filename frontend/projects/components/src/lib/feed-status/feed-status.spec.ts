import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeedStatus } from './feed-status';

@Component({
  imports: [FeedStatus],
  template: `<cr-feed-status [state]="state()" [text]="text()" (action)="retries = retries + 1" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly state = signal<'loading' | 'failed'>('loading');
  readonly text = signal('Loading more listings…');
  retries = 0;
}

// L2-006 criteria 3 and 4.
describe('FeedStatus', () => {
  it('announces the wait in a status, beside a spinner', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const status = (fixture.nativeElement as HTMLElement).querySelector('.feed-status');

    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.querySelector('cr-spinner')?.getAttribute('aria-hidden')).toBe('true');
    expect(status?.textContent?.trim()).toBe('Loading more listings…');
  });

  it('announces a failure in an alert, with "Try again"', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.state.set('failed');
    fixture.componentInstance.text.set('We couldn’t load more listings.');
    fixture.detectChanges();
    const status = (fixture.nativeElement as HTMLElement).querySelector('.feed-status');
    const button = status?.querySelector('button');

    expect(status?.getAttribute('role')).toBe('alert');
    expect(button?.textContent?.trim()).toBe('Try again');
    button?.click();
    expect(fixture.componentInstance.retries).toBe(1);
  });
});
