import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Hero } from './hero';

@Component({
  imports: [Hero],
  template: `<cr-hero title="Rent it from your" accent="church family." [lead]="lead()">
    <a href="/post">I have something to rent</a>
  </cr-hero>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly lead = signal<string | null>(null);
}

// docs/design-system/components/hero.html: Browse's headline.
describe('Hero', () => {
  function render(lead: string | null) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.lead.set(lead);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is the screen’s heading, with its accent line', () => {
    const hero = render(null).querySelector('section.hero');
    const title = hero?.querySelector('h1.hero__title');

    expect(title?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Rent it from your church family.',
    );
    expect(title?.querySelector('.hero__accent')?.textContent).toBe('church family.');
    expect(title?.getAttribute('tabindex')).toBe('-1');
    expect(hero?.getAttribute('aria-labelledby')).toBe(title?.id);
  });

  it('shows the lead only when there is one', () => {
    expect(render(null).querySelector('.hero__lead')).toBeNull();
    expect(
      render(
        'Halls, rooms, vans and tools, shared between believers near Langley, BC.',
      ).querySelector('.hero__lead')?.textContent,
    ).toBe('Halls, rooms, vans and tools, shared between believers near Langley, BC.');
  });

  it('holds the buttons that lead to posting', () => {
    expect(render(null).querySelector('.hero__actions a')?.textContent).toBe(
      'I have something to rent',
    );
  });
});
