import { ListingWindow } from './listing-window';

/** Page `n` of three items, `n1`, `n2`, `n3`. */
function items(n: number): string[] {
  return [`${n}1`, `${n}2`, `${n}3`];
}

/** Heights a page measures: 100 per page index, so each release is told apart. */
const measure = (index: number) => 100 * (index + 1);

// ADR 0013; L2-030 criterion 4: at most 3 pages are held; the rest keep a cursor and a height.
describe('ListingWindow', () => {
  function filled(pages: number): ListingWindow<string> {
    const window = new ListingWindow<string>(3);
    for (let n = 0; n < pages; n++) {
      const request = window.nextRequest('down')!;
      window.receive(request, items(n), n + 1 < pages ? `c${n + 1}` : null, measure);
    }
    return window;
  }

  // ADR 0025: a decided item leaves the queue, and the pages after it are asked for as before.
  it('drops the items that match and keeps every cursor', () => {
    const window = new ListingWindow<string>(3);
    window.receive({ index: 0, cursor: null }, items(1), 'c1', measure);
    window.receive({ index: 1, cursor: 'c1' }, items(2), 'c2', measure);

    window.drop((item) => item === '12' || item === '21');

    expect(window.items).toEqual(['11', '13', '22', '23']);
    expect(window.nextRequest('down')).toEqual({ index: 2, cursor: 'c2' });
  });

  it('asks for the first page with no cursor', () => {
    expect(new ListingWindow<string>().nextRequest('down')).toEqual({ index: 0, cursor: null });
  });

  it('asks for the next page by the cursor the last page gave', () => {
    const window = new ListingWindow<string>();
    window.receive({ index: 0, cursor: null }, items(0), 'c1', measure);

    expect(window.nextRequest('down')).toEqual({ index: 1, cursor: 'c1' });
    expect(window.nextRequest('up')).toBeNull();
  });

  it('asks for nothing after the last page (L2-006, criterion 2)', () => {
    const window = filled(2);

    expect(window.nextRequest('down')).toBeNull();
    expect(window.atEnd).toBe(true);
  });

  it('holds up to 3 pages with nothing reserved', () => {
    const window = filled(3);

    expect(window.pages.map((page) => page.index)).toEqual([0, 1, 2]);
    expect(window.items).toHaveLength(9);
    expect(window.before).toBe(0);
    expect(window.after).toBe(0);
  });

  it('releases the first page when a fourth arrives, reserving its measured height', () => {
    const window = filled(4);

    expect(window.pages.map((page) => page.index)).toEqual([1, 2, 3]);
    expect(window.items).toEqual([...items(1), ...items(2), ...items(3)]);
    expect(window.before).toBe(100);
    expect(window.after).toBe(0);
  });

  it('stays at 3 pages over a long list', () => {
    const window = filled(21);

    expect(window.items).toHaveLength(9);
    expect(window.pages.map((page) => page.index)).toEqual([18, 19, 20]);
    expect(window.before).toBe(
      Array.from({ length: 18 }, (_, i) => measure(i)).reduce((a, b) => a + b),
    );
  });

  it('asks again for a released page by the cursor that first fetched it', () => {
    const window = filled(5);

    expect(window.nextRequest('up')).toEqual({ index: 1, cursor: 'c1' });
  });

  it('brings a released page back above, and releases the last page below', () => {
    const window = filled(4);

    window.receive({ index: 0, cursor: null }, items(0), 'c1', measure);

    expect(window.pages.map((page) => page.index)).toEqual([0, 1, 2]);
    expect(window.before).toBe(0);
    expect(window.after).toBe(400);
    expect(window.atEnd).toBe(false);
    expect(window.nextRequest('down')).toEqual({ index: 3, cursor: 'c3' });
  });

  it('brings a released page back below by its own cursor', () => {
    const window = filled(4);
    window.receive({ index: 0, cursor: null }, items(0), 'c1', measure);

    window.receive({ index: 3, cursor: 'c3' }, items(3), null, measure);

    expect(window.pages.map((page) => page.index)).toEqual([1, 2, 3]);
    expect(window.after).toBe(0);
    expect(window.before).toBe(100);
    expect(window.atEnd).toBe(true);
  });

  it('ignores a page that no longer fits next to the window', () => {
    const window = filled(5);

    window.receive({ index: 0, cursor: null }, items(0), 'c1', measure);

    expect(window.pages.map((page) => page.index)).toEqual([2, 3, 4]);
  });

  it('forgets everything when cleared', () => {
    const window = filled(5);

    window.clear();

    expect(window.items).toEqual([]);
    expect(window.before).toBe(0);
    expect(window.nextRequest('down')).toEqual({ index: 0, cursor: null });
  });
});
