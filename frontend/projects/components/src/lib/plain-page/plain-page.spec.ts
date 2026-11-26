import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Icon } from '../icon/icon';
import { PlainPage } from './plain-page';

@Component({
  imports: [PlainPage],
  template: `<cr-plain-page
    icon="compass"
    title="We can’t find that page."
    text="The link may be wrong, or the page may have moved."
  >
    <a href="/">Go to Browse</a>
  </cr-plain-page>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

// docs/design-system/components/empty-state.html: the plain page that a whole screen becomes
// for "not found", "not allowed" and "not loaded".
describe('PlainPage', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  it('is the screen’s heading, one sentence and its way forward', () => {
    const element = render().nativeElement as HTMLElement;
    const page = element.querySelector('section.plain-page');

    expect(page?.querySelector('h1')?.textContent?.trim()).toBe('We can’t find that page.');
    expect(page?.querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
    expect(page?.querySelector('.plain-page__text')?.textContent?.trim()).toBe(
      'The link may be wrong, or the page may have moved.',
    );
    expect(page?.querySelector('.plain-page__actions a')?.textContent).toBe('Go to Browse');
  });

  it('shows its icon large, as decoration', () => {
    const fixture = render();
    const icon = fixture.debugElement.query(By.directive(Icon));

    expect(icon.parent?.nativeElement.classList).toContain('empty__icon');
    expect((icon.componentInstance as Icon).name()).toBe('compass');
    expect((icon.componentInstance as Icon).size()).toBe('lg');
  });
});
