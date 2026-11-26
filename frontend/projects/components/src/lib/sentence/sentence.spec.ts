import { TestBed } from '@angular/core/testing';
import type { ListingKind, ListingOffer } from '@rent/api';
import { Sentence } from './sentence';

function render(offer: ListingOffer, kind: ListingKind = 'thing') {
  const fixture = TestBed.createComponent(Sentence);
  fixture.componentRef.setInput('offer', offer);
  fixture.componentRef.setInput('kind', kind);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, heading: element.querySelector('h1')! };
}

// L2-009 criteria 1, 2, 5 and 6.
describe('Sentence', () => {
  const words = (heading: HTMLElement) => heading.textContent?.replace(/\s+/g, ' ').trim();

  it('reads "I have … to rent out." for rent, as a focusable h1', () => {
    const { heading } = render('for-rent');

    expect(words(heading)).toBe('I haveneeda spacea thing to rent out.');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(heading.querySelector<HTMLInputElement>('input[value="have"]')?.checked).toBe(true);
  });

  it('ends "to rent." when wanted, with "need" chosen', () => {
    const { heading } = render('wanted', 'space');

    expect(words(heading)).toMatch(/ to rent\.$/);
    expect(heading.querySelector<HTMLInputElement>('input[value="need"]')?.checked).toBe(true);
    expect(heading.querySelector<HTMLInputElement>('input[value="space"]')?.checked).toBe(true);
  });

  it('reports the offer and the kind chosen', () => {
    const { fixture, heading } = render('for-rent');
    const chosen: string[] = [];
    fixture.componentInstance.offerChange.subscribe((offer) => chosen.push(offer));
    fixture.componentInstance.kindChange.subscribe((kind) => chosen.push(kind));

    heading.querySelector<HTMLInputElement>('input[value="need"]')!.click();
    heading.querySelector<HTMLInputElement>('input[value="space"]')!.click();

    expect(chosen).toEqual(['wanted', 'space']);
  });
});
