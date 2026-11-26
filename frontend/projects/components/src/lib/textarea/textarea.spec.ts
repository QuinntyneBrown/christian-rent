import { TestBed } from '@angular/core/testing';
import { Textarea } from './textarea';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Textarea);
  fixture.componentRef.setInput('fieldId', 'post-note');
  fixture.componentRef.setInput('label', 'Anything else?');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, textarea: element.querySelector('textarea')! };
}

// docs/design-system/components/textarea.html; L2-010 criteria 7 and 15.
describe('Textarea', () => {
  it('labels itself "Optional", stops at its limit and counts what is used', () => {
    const { element, textarea } = render({
      optional: 'Optional',
      maxlength: 1000,
      counter: '55 / 1,000',
    });

    expect(element.querySelector('label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Anything else? Optional',
    );
    expect(textarea.getAttribute('maxlength')).toBe('1000');
    expect(element.querySelector('#post-note-counter')?.textContent).toBe('55 / 1,000');
    expect(textarea.getAttribute('aria-describedby')).toBe('post-note-counter');
  });

  it('ties its error and its counter, and marks itself invalid', () => {
    const { textarea } = render({ counter: '1,001 / 1,000', error: 'Shorten the note.' });

    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toBe('post-note-error post-note-counter');
  });

  it('reports what is typed, and reads only when asked', () => {
    const { fixture, textarea } = render({ readonly: true });
    const typed: string[] = [];
    fixture.componentInstance.value.subscribe((value) => typed.push(value));

    textarea.value = 'Pick up from my garage.';
    textarea.dispatchEvent(new Event('input'));

    expect(typed).toEqual(['Pick up from my garage.']);
    expect(textarea.readOnly).toBe(true);
  });
});
