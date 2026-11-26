import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Segmented, type SegmentedOption } from './segmented';

@Component({
  imports: [Segmented],
  template: `<cr-segmented label="Show" [options]="options()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly options = signal<readonly SegmentedOption[]>([]);
}

function options(counts: (string | null)[]): SegmentedOption[] {
  return [
    { label: 'Everything', queryParams: {}, current: false, count: counts[0] ?? null },
    {
      label: 'For rent',
      queryParams: { show: 'for-rent' },
      current: true,
      count: counts[1] ?? null,
    },
    { label: 'Wanted', queryParams: { show: 'wanted' }, current: false, count: counts[2] ?? null },
  ];
}

// docs/design-system/components/segmented.html: links named "Show", the choice aria-current.
describe('Segmented', () => {
  function render(value: SegmentedOption[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.options.set(value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is a navigation of links, each to its choice in the address', () => {
    const nav = render(options(['7', '4', '3'])).querySelector('nav.segmented');
    const links = Array.from(nav?.querySelectorAll('a.segmented__option') ?? []);

    expect(nav?.getAttribute('aria-label')).toBe('Show');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/?show=for-rent',
      '/?show=wanted',
    ]);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Everything 7',
      'For rent 4',
      'Wanted 3',
    ]);
  });

  // L2-032 criterion 3: the choice is an attribute a screen reader announces.
  it('marks the chosen option current and the others not', () => {
    const links = Array.from(render(options([])).querySelectorAll('a.segmented__option'));

    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  // L2-002 criterion 6.
  it('shows no count when there is none', () => {
    const counts = Array.from(render(options([])).querySelectorAll('.segmented__count'));

    expect(counts.map((count) => count.textContent)).toEqual(['', '', '']);
  });
});
