import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tag, type TagVariant } from './tag';

@Component({
  imports: [Tag],
  template: `<cr-tag [variant]="variant()">Wanted · space</cr-tag>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly variant = signal<TagVariant>('default');
}

// docs/design-system/components/tag.html: the label is text, never colour alone.
describe('Tag', () => {
  it.each([
    ['default', 'tag'],
    ['on-photo', 'tag--on-photo'],
    ['on-wanted', 'tag--on-wanted'],
    ['new', 'tag--new'],
    ['reported', 'tag--reported'],
    ['new-member', 'tag--new-member'],
  ] as const)('the %s variant carries %s and its words', (variant, className) => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.variant.set(variant);
    fixture.detectChanges();
    const tag = (fixture.nativeElement as HTMLElement).querySelector('.tag');

    expect(tag?.classList).toContain(className);
    expect(tag?.textContent).toBe('Wanted · space');
  });
});
