import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PostLayout } from './post-layout';

@Component({
  imports: [PostLayout],
  template: `<cr-post-layout fine="Prices are in CAD." previewLabel="How it’ll look" [busy]="true">
    <input id="field" />
    <button slot="actions" type="submit">Publish listing</button>
    <p slot="preview" id="card">Card</p>
  </cr-post-layout>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

// docs/design-system/foundations/layout.html (post-layout); L2-012 criterion 7; L2-031 criterion 4.
describe('PostLayout', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('puts the fields and actions in the form and the preview under its heading in the aside', () => {
    const element = render();

    const form = element.querySelector('form.post-form');
    expect(form?.getAttribute('aria-busy')).toBe('true');
    expect(form?.querySelector('#field')).not.toBeNull();
    expect(form?.querySelector('.post-actions button')?.textContent).toBe('Publish listing');
    expect(form?.querySelector('.post-actions__fine')?.textContent).toBe('Prices are in CAD.');
    const aside = element.querySelector('aside');
    expect(aside?.getAttribute('aria-labelledby')).toBe('post-preview-label');
    expect(aside?.querySelector('h2#post-preview-label')?.textContent).toBe('How it’ll look');
    expect(aside?.querySelector('#card')).not.toBeNull();
  });

  it('emits a submission instead of loading another page', () => {
    const fixture = TestBed.createComponent(PostLayout);
    fixture.componentRef.setInput('fine', 'Prices are in CAD.');
    fixture.componentRef.setInput('previewLabel', 'How it’ll look');
    fixture.detectChanges();
    let submitted = 0;
    fixture.componentInstance.submitted.subscribe(() => submitted++);
    const event = new Event('submit', { cancelable: true });

    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(event);

    expect(submitted).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
