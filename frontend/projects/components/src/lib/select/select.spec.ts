import { TestBed } from '@angular/core/testing';
import { Select } from './select';

const options = [
  { value: 'grace', label: 'Grace Community Church, Langley' },
  { value: 'new', label: 'My church isn’t listed' },
];

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Select);
  fixture.componentRef.setInput('fieldId', 'join-church');
  fixture.componentRef.setInput('label', 'Your church');
  fixture.componentRef.setInput('options', options);
  fixture.componentRef.setInput('prompt', 'Choose a church');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, select: element.querySelector('select')! };
}

// docs/design-system/components/select.html; L2-017 criterion 8; L2-032 criterion 5.
describe('Select', () => {
  it('prompts until a choice is made, then shows the choice', () => {
    const { fixture, select } = render();

    expect(Array.from(select.options).map((option) => option.text.trim())).toEqual([
      'Choose a church',
      'Grace Community Church, Langley',
      'My church isn’t listed',
    ]);
    expect(select.value).toBe('');

    fixture.componentRef.setInput('value', 'new');
    fixture.detectChanges();
    expect(select.value).toBe('new');
  });

  it('reports the choice', () => {
    const { fixture, select } = render();
    const chosen: string[] = [];
    fixture.componentInstance.value.subscribe((value) => chosen.push(value));

    select.value = 'grace';
    select.dispatchEvent(new Event('change'));

    expect(chosen).toEqual(['grace']);
  });

  it('marks an error and ties it to the select', () => {
    const { element, select } = render({ error: 'Choose your church.' });

    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe('join-church-error');
    expect(element.querySelector('#join-church-error')?.textContent).toBe('Choose your church.');
  });

  it('ties its help, and is off while busy', () => {
    const { element, select } = render({ help: 'We couldn’t load the list.', disabled: true });

    expect(select.getAttribute('aria-describedby')).toBe('join-church-help');
    expect(element.querySelector('#join-church-help')?.textContent).toBe(
      'We couldn’t load the list.',
    );
    expect(select.disabled).toBe(true);
  });
});
