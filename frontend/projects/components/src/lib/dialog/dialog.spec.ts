import { TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';

function render(closeDisabled = false) {
  const fixture = TestBed.createComponent(Dialog);
  fixture.componentRef.setInput('titleId', 'join-title');
  fixture.componentRef.setInput('title', 'Become a member to post');
  fixture.componentRef.setInput('descriptionId', 'join-description');
  fixture.componentRef.setInput('description', 'Browsing is open to anyone.');
  fixture.componentRef.setInput('closeDisabled', closeDisabled);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

// docs/design-system/components/dialog.html.
describe('Dialog', () => {
  it('titles the panel with an h2 and describes it, by the ids the dialog is labelled with', () => {
    const { element } = render();

    const title = element.querySelector('h2.dialog__title');
    expect(title?.id).toBe('join-title');
    expect(title?.textContent).toBe('Become a member to post');
    const description = element.querySelector('.dialog__description');
    expect(description?.id).toBe('join-description');
    expect(description?.textContent).toBe('Browsing is open to anyone.');
  });

  it('reports Close, unless closing is off while busy', () => {
    const open = render();
    let closes = 0;
    open.fixture.componentInstance.closed.subscribe(() => closes++);
    open.element.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    expect(closes).toBe(1);

    const busy = render(true);
    busy.fixture.componentInstance.closed.subscribe(() => closes++);
    const close = busy.element.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!;
    expect(close.getAttribute('aria-disabled')).toBe('true');
    close.click();
    expect(closes).toBe(1);
  });
});
