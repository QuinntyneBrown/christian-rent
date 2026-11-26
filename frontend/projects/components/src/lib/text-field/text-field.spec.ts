import { TestBed } from '@angular/core/testing';
import { TextField } from './text-field';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(TextField);
  fixture.componentRef.setInput('fieldId', 'join-name');
  fixture.componentRef.setInput('label', 'Your name');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, input: element.querySelector('input')! };
}

// docs/design-system/components/text-field.html; L2-032 criterion 5.
describe('TextField', () => {
  it('has a visible label tied to its box', () => {
    const { element, input } = render({ maxlength: 60, autocomplete: 'name' });

    expect(element.querySelector('label')?.textContent).toBe('Your name');
    expect(element.querySelector('label')?.getAttribute('for')).toBe('join-name');
    expect(input.id).toBe('join-name');
    expect(input.getAttribute('maxlength')).toBe('60');
    expect(input.getAttribute('autocomplete')).toBe('name');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('marks an error and ties it to the box, in place of the help', () => {
    const { element, input } = render({
      help: 'A city in Canada.',
      error: 'Enter your name, up to 60 characters.',
    });

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('join-name-error');
    expect(element.querySelector('#join-name-error')?.textContent).toBe(
      'Enter your name, up to 60 characters.',
    );
    expect(element.querySelector('.field__help')).toBeNull();
  });

  it('ties its help when there is no error', () => {
    const { element, input } = render({ help: 'A city in Canada.' });

    expect(input.getAttribute('aria-describedby')).toBe('join-name-help');
    expect(element.querySelector('#join-name-help')?.textContent).toBe('A city in Canada.');
  });

  it('shows its value and reports what is typed', () => {
    const { fixture, input } = render({ value: 'Sarah' });
    const typed: string[] = [];
    fixture.componentInstance.value.subscribe((value) => typed.push(value));

    expect(input.value).toBe('Sarah');
    input.value = 'Sarah Kim';
    input.dispatchEvent(new Event('input'));

    expect(typed).toEqual(['Sarah Kim']);
  });

  it('is read-only while busy', () => {
    expect(render({ readonly: true }).input.readOnly).toBe(true);
  });
});
