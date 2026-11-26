import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PosterView } from '@rent/api';
import { Poster } from './poster';

@Component({
  imports: [Poster],
  template: `<cr-poster [poster]="poster()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly poster = signal<PosterView>({
    name: 'Marcus Lee',
    initials: 'ML',
    tint: 'leaf',
    isVerified: true,
    church: 'New Song Fellowship',
    churchIsVerified: false,
    since: 'Member since 2024',
  });
}

// L2-008 criteria 2 to 4: the member and the church each carry the mark only when verified.
// One case per row.
describe('Poster', () => {
  it.each([
    [true, true, ['Verified member', 'Verified church']],
    [true, false, ['Verified member']],
    [false, true, ['Verified church']],
    [false, false, []],
  ])(
    'with the member verified %s and the church %s, shows %j',
    (isVerified, churchIsVerified, marks) => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.poster.update((poster) => ({
        ...poster,
        isVerified,
        churchIsVerified,
      }));
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      const shown = Array.from(element.querySelectorAll('.verified')).map((mark) =>
        mark.textContent!.replace(/\s+/g, ' ').trim(),
      );
      expect(shown).toEqual(marks);
      expect(element.querySelector('.poster__name')?.textContent).toBe('Marcus Lee');
      expect(element.querySelector('.avatar')?.classList).toContain('avatar--leaf');
    },
  );
});
