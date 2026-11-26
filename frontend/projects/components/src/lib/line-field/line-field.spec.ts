import { TestBed } from '@angular/core/testing';
import { LineField } from './line-field';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(LineField);
  fixture.componentRef.setInput('fieldId', 'post-price');
  fixture.componentRef.setInput('label', 'Your budget');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, input: element.querySelector('input')! };
}

const PERIODS = [
  { value: 'hour', label: 'per hour' },
  { value: 'day', label: 'per day' },
];

// docs/design-system/components/line-field.html; L2-010 criteria 3, 11 and 13; L2-032 criterion 5.
describe('LineField', () => {
  it('labels its input, says "Optional", and hides its prefix from a screen reader', () => {
    const { element, input } = render({ optional: 'Optional', prefix: 'Up to $', maxlength: 80 });

    const label = element.querySelector('label.line-field__label');
    expect(label?.getAttribute('for')).toBe('post-price');
    expect(label?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Your budget Optional');
    expect(element.querySelector('.line-field__prefix')?.getAttribute('aria-hidden')).toBe('true');
    expect(input.getAttribute('maxlength')).toBe('80');
  });

  it('offers its units in a select named "Per", and reports the one chosen', () => {
    const { fixture, element } = render({ units: PERIODS, unit: 'day' });
    const select = element.querySelector('select')!;
    const chosen: string[] = [];
    fixture.componentInstance.unit.subscribe((unit) => chosen.push(unit));

    expect(element.querySelector(`label[for="${select.id}"]`)?.textContent).toBe('Per');
    expect(select.value).toBe('day');
    select.value = 'hour';
    select.dispatchEvent(new Event('change'));

    expect(chosen).toEqual(['hour']);
  });

  it('ties its error in place of its help, and marks the input invalid', () => {
    const { element, input } = render({ help: 'A city in Canada.', error: 'Say where it is.' });

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('post-price-error');
    expect(element.querySelector('.field__help')).toBeNull();
  });

  it('reads only, units included, while a listing is sent', () => {
    const { element, input } = render({ units: PERIODS, readonly: true, switchLabel: 'Switch' });

    expect(input.readOnly).toBe(true);
    expect(element.querySelector('select')?.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  });

  it('reports what is typed and a press of its switch', () => {
    const { fixture, element, input } = render({ switchLabel: 'Give dates instead' });
    const events: string[] = [];
    fixture.componentInstance.value.subscribe((value) => events.push(value));
    fixture.componentInstance.switched.subscribe(() => events.push('switched'));

    input.value = '25';
    input.dispatchEvent(new Event('input'));
    element.querySelector('button')!.click();

    expect(events).toEqual(['25', 'switched']);
  });
});
