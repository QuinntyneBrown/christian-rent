import { TestBed } from '@angular/core/testing';
import type { PickerPhoto } from '@rent/api';
import { PhotoPicker } from './photo-picker';

const ready = (key: string): PickerPhoto => ({
  key,
  url: `/api/photos/${key}/thumb`,
  uploading: false,
});

// docs/design-system/components/photo-picker.html; L2-013 criteria 1, 3, 6 and 7; ADR 0021.
describe('PhotoPicker', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(PhotoPicker);
    fixture.componentRef.setInput('fieldId', 'post-photos');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  it('is a group named "Photos" with the count of photos that are in', () => {
    const { element } = render({
      photos: [ready('p1'), { key: 'u1', url: 'blob:x', uploading: true }],
    });

    expect(element.querySelector('[role="group"]')?.getAttribute('aria-labelledby')).toBe(
      'post-photos-label',
    );
    expect(text(element.querySelector('#post-photos-label'))).toBe('Photos 1 of 6');
  });

  it('marks the first photo "On the card" and names each button by its position', () => {
    const { element } = render({
      photos: [ready('p1'), ready('p2'), { key: 'u1', url: 'blob:x', uploading: true }],
    });
    const buttons = [...element.querySelectorAll('.photo-picker__remove')];

    expect(element.querySelectorAll('.photo-picker__first')).toHaveLength(1);
    expect(element.querySelector('.photo-picker__item .photo-picker__first')).not.toBeNull();
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove photo 1',
      'Remove photo 2',
      'Cancel upload of photo 3',
    ]);
    expect(element.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
      'Uploading photo 3',
    );
  });

  it('emits the key of the photo to remove', () => {
    const { fixture, element } = render({ photos: [ready('p1'), ready('p2')] });
    const removed: string[] = [];
    fixture.componentInstance.remove.subscribe((key) => removed.push(key));

    element.querySelectorAll<HTMLButtonElement>('.photo-picker__remove')[1]?.click();

    expect(removed).toEqual(['p2']);
  });

  it('turns Add off with 6 photos and says to remove one', () => {
    const { element } = render({
      photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(ready),
    });

    expect(element.querySelector<HTMLButtonElement>('.photo-picker__add')?.disabled).toBe(true);
    expect(text(element.querySelector('.field__help'))).toBe(
      'That’s all 6 photos. Remove one to add another.',
    );
  });

  it('shows a problem as an alert in place of the help, as text', () => {
    const { element } = render({ problem: '“<b>x</b>.tiff” wasn’t added.' });

    const alert = element.querySelector('.field__error');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toBe('“<b>x</b>.tiff” wasn’t added.');
    expect(element.querySelector('.field__help')).toBeNull();
  });

  it('emits the one file chosen, and is ready for the same file again', () => {
    const { fixture, element } = render({});
    const chosen: File[] = [];
    fixture.componentInstance.chosen.subscribe((file) => chosen.push(file));
    const input = element.querySelector<HTMLInputElement>('.photo-picker__file')!;
    const file = new File(['x'], 'hall.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    input.dispatchEvent(new Event('change'));

    expect(chosen).toEqual([file]);
    expect(input.value).toBe('');
    expect(input.multiple).toBe(false);
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
  });
});
