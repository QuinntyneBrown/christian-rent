import { TestBed } from '@angular/core/testing';
import { RadioGroup } from './radio-group';

const OPTIONS = [
  { value: 'fake', label: 'Not a real listing' },
  { value: 'scam', label: 'A scam' },
];

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(RadioGroup);
  fixture.componentRef.setInput('fieldId', 'report-reason');
  fixture.componentRef.setInput('legend', 'Why are you reporting it?');
  fixture.componentRef.setInput('options', OPTIONS);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    element,
    fieldset: element.querySelector('fieldset')!,
    radios: [...element.querySelectorAll('input')],
  };
}

// docs/design-system/components/radio-group.html; L2-021 criteria 1 and 7.
describe('RadioGroup', () => {
  it('asks a question, says it is required and offers one choice of the options', () => {
    const { element, radios } = render();

    expect(element.querySelector('legend')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Why are you reporting it? Required',
    );
    expect(element.querySelector('legend .visually-hidden')?.textContent).toBe('Required');
    expect(radios.map((radio) => radio.type)).toEqual(['radio', 'radio']);
    expect(radios.map((radio) => radio.name)).toEqual(['report-reason', 'report-reason']);
    expect(radios.map((radio) => radio.id)).toEqual(['report-reason-fake', 'report-reason-scam']);
    expect(radios.map((radio) => radio.checked)).toEqual([false, false]);
    expect(
      [...element.querySelectorAll('label.choice .choice__text')].map((text) => text.textContent),
    ).toEqual(['Not a real listing', 'A scam']);
  });

  it('chooses the value it is given and reports a choice', () => {
    const { fixture, radios } = render({ value: 'fake' });
    const choices: (string | null)[] = [];
    fixture.componentInstance.value.subscribe((value) => choices.push(value));
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);

    radios[1]!.checked = true;
    radios[1]!.dispatchEvent(new Event('change'));

    expect(choices).toEqual(['scam']);
  });

  it('marks an error on the group, announces it and ties it to the group', () => {
    const { element, fieldset, radios } = render({ error: 'Choose a reason.' });

    const error = element.querySelector('.field__error')!;
    expect(error.textContent).toBe('Choose a reason.');
    expect(error.getAttribute('role')).toBe('alert');
    expect(fieldset.getAttribute('aria-describedby')).toBe(error.id);
    expect(radios.map((radio) => radio.getAttribute('aria-invalid'))).toEqual(['true', 'true']);
  });

  it('is valid and undescribed without an error', () => {
    const { element, fieldset, radios } = render();

    expect(element.querySelector('.field__error')).toBeNull();
    expect(fieldset.hasAttribute('aria-describedby')).toBe(false);
    expect(radios.some((radio) => radio.hasAttribute('aria-invalid'))).toBe(false);
  });

  it('turns every option off', () => {
    const { radios } = render({ disabled: true });

    expect(radios.map((radio) => radio.disabled)).toEqual([true, true]);
  });
});
