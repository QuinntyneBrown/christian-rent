import { TestBed } from '@angular/core/testing';
import { Icon, type IconName } from './icon';

// The set, as docs/design-system/foundations/iconography.html draws it; one case per icon.
const SET: [IconName, string][] = [
  ['search', '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>'],
  [
    'pin',
    '<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle>',
  ],
  [
    'calendar',
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path>',
  ],
  ['plus', '<path d="M12 5v14M5 12h14"></path>'],
  ['x', '<path d="M6 6l12 12M18 6 6 18"></path>'],
  ['check', '<path d="m5 12 5 5L20 7"></path>'],
  ['arrow-left', '<path d="M19 12H5m0 0 6 6m-6-6 6-6"></path>'],
  ['arrow-right', '<path d="M5 12h14m0 0-6-6m6 6-6 6"></path>'],
  ['flag', '<path d="M5 21V4m0 0h11l-2 4 2 4H5"></path>'],
  [
    'badge-check',
    '<path d="M12 3l2.3 1.7 2.9-.1.9 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-.9 2.7-2.9-.1L12 21l-2.3-1.7-2.9.1-.9-2.7-2.3-1.7.9-2.7-.9-2.7 2.3-1.7.9-2.7 2.9.1z"></path><path d="m9 12 2 2 4-4"></path>',
  ],
  [
    'image-plus',
    '<rect x="3" y="5" width="14" height="14" rx="2"></rect><path d="m3 15 4-4 6 6M19 3v6M16 6h6"></path>',
  ],
  [
    'image',
    '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m3 17 5-5 4 4 3-3 6 6"></path>',
  ],
  ['inbox', '<path d="M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z"></path>'],
  ['login', '<path d="M14 4h5v16h-5M9 8l4 4-4 4M13 12H3"></path>'],
  ['logout', '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"></path>'],
  ['external', '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"></path>'],
  ['alert', '<path d="M12 3 2 20h20zM12 10v4M12 17v.5"></path>'],
  ['info', '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8v.5"></path>'],
  ['check-circle', '<circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path>'],
  ['x-circle', '<circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6M15 9l-6 6"></path>'],
  [
    'refresh',
    '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"></path>',
  ],
  [
    'lock',
    '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',
  ],
  ['user', '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>'],
  ['compass', '<circle cx="12" cy="12" r="9"></circle><path d="m15 9-2 4-4 2 2-4z"></path>'],
];

function render(name: IconName, size?: 'sm' | 'md' | 'lg') {
  const fixture = TestBed.createComponent(Icon);
  fixture.componentRef.setInput('name', name);
  if (size) {
    fixture.componentRef.setInput('size', size);
  }
  fixture.detectChanges();
  const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
  if (!svg) {
    throw new Error('cr-icon rendered no <svg>');
  }
  return svg;
}

function shapes(svg: SVGElement): string {
  return svg.innerHTML.replace(/<!--[^>]*-->/g, '').replace(/\s+_ng\w+-[\w-]+=""/g, '');
}

describe('Icon', () => {
  it.each(SET)('draws %s as the iconography foundation does', (name, markup) => {
    expect(shapes(render(name))).toBe(markup);
  });

  it('is decoration: hidden from assistive technology, on the 24-unit grid', () => {
    const svg = render('plus');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.classList).toContain('icon');
  });

  it.each([
    ['sm', 'icon--sm'],
    ['lg', 'icon--lg'],
  ] as const)('takes the %s size', (size, modifier) => {
    expect(render('plus', size).classList).toContain(modifier);
  });

  it('is 20 px by default', () => {
    const svg = render('plus');
    expect(svg.classList).not.toContain('icon--sm');
    expect(svg.classList).not.toContain('icon--lg');
  });
});
