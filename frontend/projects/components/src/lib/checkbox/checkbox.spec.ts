import { TestBed } from '@angular/core/testing';
import { Checkbox } from './checkbox';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Checkbox);
  fixture.componentRef.setInput('fieldId', 'join-declaration');
  fixture.componentRef.setInput('label', 'I am a Christian');
  fixture.componentRef.setInput('description', 'christian.rent is for Christians.');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, box: element.querySelector('input')! };
}

// docs/design-system/components/checkbox.html; L2-017 criterion 9.
describe('Checkbox', () => {
  it('is a statement the person ticks themselves, with why it is asked', () => {
    const { element, box } = render();

    expect(box.type).toBe('checkbox');
    expect(box.checked).toBe(false);
    expect(element.querySelector('label.choice')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'I am a Christian christian.rent is for Christians.',
    );
  });

  it('reports a tick', () => {
    const { fixture, box } = render();
    const ticks: boolean[] = [];
    fixture.componentInstance.checked.subscribe((checked) => ticks.push(checked));

    box.checked = true;
    box.dispatchEvent(new Event('change'));

    expect(ticks).toEqual([true]);
  });

  it('marks an error and ties it to the box', () => {
    const { element, box } = render({ error: 'Tick the box to declare that you are a Christian.' });

    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(box.getAttribute('aria-describedby')).toBe('join-declaration-error');
    expect(element.querySelector('#join-declaration-error')?.textContent).toBe(
      'Tick the box to declare that you are a Christian.',
    );
  });
});
