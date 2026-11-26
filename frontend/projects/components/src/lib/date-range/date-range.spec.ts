import { TestBed } from '@angular/core/testing';
import { DateRange } from './date-range';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(DateRange);
  fixture.componentRef.setInput('fieldId', 'post-dates');
  fixture.componentRef.setInput('legend', 'When');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const [start, end] = [...element.querySelectorAll('input')];
  return { fixture, element, start: start!, end: end! };
}

// docs/design-system/components/date-range.html; L2-010 criteria 5 and 10.
describe('DateRange', () => {
  it('is a fieldset named by its legend with two labelled dates and the range in words', () => {
    const { element, start, end } = render({
      start: '2026-07-14',
      end: '2026-07-18',
      summary: 'Jul 14 to 18, 2026',
    });

    expect(element.querySelector('fieldset legend')?.textContent).toBe('When');
    expect(element.querySelector(`label[for="${start.id}"]`)?.textContent).toBe('From');
    expect(element.querySelector(`label[for="${end.id}"]`)?.textContent).toBe('To');
    expect([start.type, start.value, end.value, end.min]).toEqual([
      'date',
      '2026-07-14',
      '2026-07-18',
      '2026-07-14',
    ]);
    expect(element.querySelector('.date-range__summary')?.textContent).toBe('Jul 14 to 18, 2026');
  });

  it('shows one error, tied to the invalid date, in place of the summary', () => {
    const { element, start, end } = render({
      summary: 'Jul 14 to 18, 2026',
      endError: 'The end date is before the start date.',
    });

    expect(start.getAttribute('aria-invalid')).toBeNull();
    expect(end.getAttribute('aria-invalid')).toBe('true');
    expect(end.getAttribute('aria-describedby')).toBe('post-dates-error');
    expect(element.querySelector('#post-dates-error')?.textContent).toBe(
      'The end date is before the start date.',
    );
    expect(element.querySelector('.date-range__summary')).toBeNull();
  });

  it('reports the dates chosen and a press of its switch', () => {
    const { fixture, element, start, end } = render({
      switchLabel: 'Describe it in words instead',
    });
    const events: string[] = [];
    fixture.componentInstance.start.subscribe((value) => events.push(`start ${value}`));
    fixture.componentInstance.end.subscribe((value) => events.push(`end ${value}`));
    fixture.componentInstance.switched.subscribe(() => events.push('switched'));

    start.value = '2026-07-14';
    start.dispatchEvent(new Event('input'));
    end.value = '2026-07-18';
    end.dispatchEvent(new Event('input'));
    element.querySelector('button')!.click();

    expect(events).toEqual(['start 2026-07-14', 'end 2026-07-18', 'switched']);
  });

  // docs/mocks/pages/listing: in the message box the legend is hidden and the start has a floor.
  it('hides its legend and offers no start before the earliest date when asked', () => {
    const { element, start } = render({ legendHidden: true, min: '2026-06-08' });

    expect(element.querySelector('legend')?.classList.contains('visually-hidden')).toBe(true);
    expect(start.min).toBe('2026-06-08');
  });
});
