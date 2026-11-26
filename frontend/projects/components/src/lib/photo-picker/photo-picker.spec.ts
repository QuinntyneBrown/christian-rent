import { TestBed } from '@angular/core/testing';
import { PhotoPicker } from './photo-picker';

// docs/design-system/components/photo-picker.html; L2-013; ADR 0019.
describe('PhotoPicker', () => {
  it('is a group named "Photos" with its count, and an Add tile disabled until uploads exist', () => {
    const fixture = TestBed.createComponent(PhotoPicker);
    fixture.componentRef.setInput('fieldId', 'post-photos');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const group = element.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-labelledby')).toBe('post-photos-label');
    expect(
      element.querySelector('#post-photos-label')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Photos 0 of 6');
    expect(element.querySelector<HTMLButtonElement>('.photo-picker__add')?.disabled).toBe(true);
  });
});
