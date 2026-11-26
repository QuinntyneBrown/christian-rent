import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ListingCardView } from '@rent/api';
import { ListingCard } from './listing-card';

@Component({
  imports: [ListingCard],
  template: `<cr-listing-card [card]="card()" [heading]="heading()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly card = signal<ListingCardView | null>(null);
  readonly heading = signal(true);
}

const hall: ListingCardView = {
  href: '/listings/a1',
  wanted: false,
  tag: 'space',
  title: 'Sunlit fellowship hall for 80',
  price: { amount: '$45', per: '/ hour' },
  place: 'Langley',
  church: 'Grace Community Church',
  poster: null,
  when: null,
  photo: { url: '/api/photos/p1/card', width: 800, height: 600, alt: 'A bright hall' },
};

const van: ListingCardView = {
  href: '/listings/w1',
  wanted: true,
  tag: 'Wanted · thing',
  title: '15-passenger van for youth camp',
  price: { amount: 'Up to $120', per: '/ day' },
  place: 'Murrayville, Langley',
  church: 'New Song Fellowship',
  poster: 'Marcus Lee',
  when: 'Jul 14 to 18, 2026',
  photo: null,
};

// docs/design-system/components/listing-card.html; L2-001 criteria 3 to 8.
describe('ListingCard', () => {
  function render(card: ListingCardView | null, heading = true) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.card.set(card);
    fixture.componentInstance.heading.set(heading);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  it('links a card for rent to its listing, with its photo, kind, price, area and church', () => {
    const card = render(hall).querySelector('a.listing-card');

    expect(card?.getAttribute('href')).toBe('/listings/a1');
    expect(card?.classList).not.toContain('listing-card--wanted');
    const photo = card?.querySelector('img.listing-card__photo');
    expect(photo?.getAttribute('alt')).toBe('A bright hall');
    expect(photo?.getAttribute('width')).toBe('800');
    expect(photo?.getAttribute('height')).toBe('600');
    expect(photo?.getAttribute('loading')).toBe('lazy');
    expect(text(card?.querySelector('.listing-card__kind'))).toBe('space');
    expect(text(card?.querySelector('h2.listing-card__title'))).toBe(
      'Sunlit fellowship hall for 80',
    );
    expect(text(card?.querySelector('.listing-card__price'))).toBe('$45 / hour');
    expect(text(card?.querySelector('.listing-card__place'))).toBe('Langley');
    expect(text(card?.querySelector('.listing-card__church'))).toBe('Grace Community Church');
  });

  it('shows the "No photo yet" placeholder for a listing for rent with no photo', () => {
    const card = render({ ...hall, photo: null });

    expect(card.querySelector('img')).toBeNull();
    const placeholder = card.querySelector('.listing-card__no-photo');
    expect(placeholder?.getAttribute('role')).toBe('img');
    expect(placeholder?.getAttribute('aria-label')).toBe('No photo yet');
  });

  it('draws a wanted card with no photo, "Wanted" in text, when and the poster', () => {
    const card = render(van).querySelector('a.listing-card');

    expect(card?.classList).toContain('listing-card--wanted');
    expect(card?.querySelector('img')).toBeNull();
    expect(text(card?.querySelector('.tag'))).toBe('Wanted · thing');
    expect(text(card?.querySelector('h2.listing-card__ask'))).toBe(
      '15-passenger van for youth camp',
    );
    expect(text(card?.querySelector('.listing-card__when'))).toBe('Jul 14 to 18, 2026');
    expect(text(card?.querySelector('p.listing-card__title'))).toBe('Marcus Lee');
    expect(text(card?.querySelector('.listing-card__price'))).toBe('Up to $120 / day');
  });

  it('shows no price when there is none, and "Free" alone', () => {
    expect(render({ ...van, price: null }).querySelector('.listing-card__price')).toBeNull();
    TestBed.resetTestingModule();
    expect(
      text(
        render({ ...hall, price: { amount: 'Free', per: null } }).querySelector(
          '.listing-card__price',
        ),
      ),
    ).toBe('Free');
  });

  it('renders what a member wrote as text, never as HTML', () => {
    const card = render({ ...hall, title: '<b>Hall</b>', church: '<img src=x onerror=alert(1)>' });

    expect(card.querySelector('b')).toBeNull();
    expect(text(card.querySelector('h2.listing-card__title'))).toBe('<b>Hall</b>');
    expect(card.querySelectorAll('img')).toHaveLength(1);
  });

  it('is a skeleton in the card’s shape while there is no card', () => {
    const skeleton = render(null).querySelector('div.listing-card');

    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.querySelectorAll('cr-skeleton')).toHaveLength(4);
  });

  // ADR 0019; L2-011: Post's preview is a plain block, not a link, with no heading of its own,
  // and mutes its title and price while the title is a placeholder.
  it('draws a preview with no address as a plain block whose title is no heading', () => {
    const element = render({ ...hall, href: null, placeholder: true }, false);

    expect(element.querySelector('a')).toBeNull();
    const card = element.querySelector('div.listing-card');
    expect(card?.classList).toContain('listing-card--placeholder');
    expect(card?.querySelector('h2')).toBeNull();
    expect(text(card?.querySelector('p.listing-card__title'))).toBe(
      'Sunlit fellowship hall for 80',
    );
  });

  it('keeps a wanted preview’s ask as a paragraph', () => {
    expect(
      render({ ...van, href: null }, false).querySelector('p.listing-card__ask'),
    ).not.toBeNull();
  });

  it('makes a wanted card’s ask its heading when asked', () => {
    expect(render({ ...van, href: null }).querySelector('h2.listing-card__ask')).not.toBeNull();
  });
});
