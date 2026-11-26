import { TestBed } from '@angular/core/testing';
import { WordToggle } from './word-toggle';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(WordToggle);
  fixture.componentRef.setInput('name', 'post-kind');
  fixture.componentRef.setInput('label', 'A space or a thing?');
  fixture.componentRef.setInput('options', [
    { value: 'space', label: 'a space' },
    { value: 'thing', label: 'a thing' },
  ]);
  fixture.componentRef.setInput('value', 'thing');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, radios: [...element.querySelectorAll('input')] };
}

// docs/design-system/components/word-toggle.html; L2-009 criterion 3.
describe('WordToggle', () => {
  it('is a radio group named by its question, each word a named radio', () => {
    const { element, radios } = render();
    const group = element.querySelector('.word-toggle');

    expect(group?.getAttribute('role')).toBe('radiogroup');
    expect(group?.getAttribute('aria-label')).toBe('A space or a thing?');
    expect([...element.querySelectorAll('label')].map((label) => label.textContent)).toEqual([
      'a space',
      'a thing',
    ]);
    expect(radios.map((radio) => [radio.name, radio.value, radio.checked])).toEqual([
      ['post-kind', 'space', false],
      ['post-kind', 'thing', true],
    ]);
  });

  it('reports the word chosen', () => {
    const { fixture, radios } = render();
    const chosen: string[] = [];
    fixture.componentInstance.value.subscribe((value) => chosen.push(value));

    radios[0]!.click();

    expect(chosen).toEqual(['space']);
  });

  it('colours the side words with the side modifier, and disables both when asked', () => {
    const { element, radios } = render({ side: true, disabled: true });

    expect(element.querySelector('.word-toggle')?.classList).toContain('word-toggle--side');
    expect(radios.every((radio) => radio.disabled)).toBe(true);
  });
});
