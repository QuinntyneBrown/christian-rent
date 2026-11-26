// Acceptance Test
// Traces to: L2-001, L2-011, L2-022, L2-026, L2-031
// Description: Browse with the edge mock's listings: long words, no photo, no price, text that looks like HTML.
import { answerPhotos, forRent, page as listingsPage, wanted } from '../fixtures/listings';
import { expect, test } from '../fixtures/test';
import { BrowsePage } from '../pages/browse.page';

const edge = [
  forRent('Gymnasium with a full-size hardwood court, bleachers and a kitchenette', {
    price: { amount: 1250.5, period: 'week' },
    area: 'Clayton Heights, Surrey',
    churchName: 'Fraser Valley Evangelical Missionary Fellowship',
  }),
  wanted('Wheelchair-accessible passenger van with a ramp for our seniors’ retreat', {
    price: { amount: 100000, period: 'month' },
    area: 'Murrayville, Langley',
    when: { text: null, start: '2026-07-14', end: '2026-07-18' },
    posterName: 'Bartholomew Oyelaran-Featherstonehaugh',
    churchName: 'Église Évangélique Baptiste de la Vallée du Fraser',
  }),
  forRent('Parking space', {
    photoName: null,
    kind: 'thing',
    price: { amount: 0, period: 'day' },
    area: 'Fort Langley',
    churchName: 'Cornerstone Church',
  }),
  wanted('Chairs', { when: { text: 'Any day this summer', start: null, end: null } }),
  forRent('<img src=x onerror=alert(1)> Trailer', { churchName: '<b>Grace</b>' }),
];

test.describe('Browse at its edges', () => {
  test.beforeEach(({ api }) => {
    api.answer('GET', '/api/listings', { body: listingsPage(edge) });
    answerPhotos(api);
  });

  // L2-022 criteria 1 and 6; L2-010 criteria 2 and 4; L2-011 criterion 5.
  test('writes large prices, "Free", no price, and the "No photo yet" placeholder', async ({
    page,
  }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    await expect(
      browse.cardTitled('Gymnasium with a full-size hardwood court, bleachers and a kitchenette')
        .price,
    ).toHaveText('$1,250.50 / week');
    const van = browse.cardTitled(
      'Wheelchair-accessible passenger van with a ramp for our seniors’ retreat',
    );
    await expect(van.price).toHaveText('Up to $100,000 / month');
    await expect(van.poster).toHaveText('Bartholomew Oyelaran-Featherstonehaugh');
    const parking = browse.cardTitled('Parking space');
    await expect(parking.price).toHaveText('Free');
    await expect(parking.photo).toHaveCount(0);
    await expect(parking.noPhoto).toHaveRole('img');
    await expect(parking.noPhoto).toHaveAccessibleName('No photo yet');
    const chairs = browse.cardTitled('Chairs');
    await expect(chairs.price).toHaveCount(0);
    await expect(chairs.when).toHaveText('Any day this summer');
  });

  // L2-026 criterion 1; AGENTS.md: what a member writes is rendered as text.
  test('renders what a member wrote as text, never as HTML', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.open();

    const trailer = browse.cardTitled('<img src=x onerror=alert(1)> Trailer');
    await expect(trailer.title).toHaveText('<img src=x onerror=alert(1)> Trailer');
    await expect(trailer.church).toHaveText('<b>Grace</b>');
    await expect(trailer.root.locator('img')).toHaveCount(1);
    await expect(trailer.root.locator('b')).toHaveCount(0);
  });

  // L2-031 criteria 1 and 2: nothing cut off, nothing sideways, one column under 576 px.
  test('wraps long words in one column at 320 px without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const browse = new BrowsePage(page);
    await browse.open();
    await expect(browse.cards).toHaveCount(5);

    expect(await browse.scrollsSideways()).toBe(false);
    const first = await browse.card(0).root.boundingBox();
    const second = await browse.card(1).root.boundingBox();
    expect(second!.x).toBe(first!.x);
    expect(first!.x + first!.width).toBeLessThanOrEqual(320);
  });

  // L2-031 criterion 2: two columns from 576 px, three from 768 and four from 1200.
  for (const [width, columns] of [
    [575, 1],
    [576, 2],
    [768, 3],
    [1199, 3],
    [1200, 4],
  ] as const) {
    test(`puts the cards in ${columns} column${columns > 1 ? 's' : ''} at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const browse = new BrowsePage(page);
      await browse.open();
      await expect(browse.cards).toHaveCount(5);

      const lefts = new Set<number>();
      for (const card of await browse.cards.all()) {
        lefts.add(Math.round((await card.boundingBox())!.x));
      }
      expect(lefts.size).toBe(columns);
    });
  }

  // L2-031 criterion 2: from 992 px the gutters between the cards widen.
  test('widens the gutter between cards from 992 px', async ({ page }) => {
    const browse = new BrowsePage(page);
    const gutters: number[] = [];
    for (const width of [991, 992]) {
      await page.setViewportSize({ width, height: 900 });
      await browse.open();
      await expect(browse.cards).toHaveCount(5);
      const first = (await browse.card(0).root.boundingBox())!;
      const second = (await browse.card(1).root.boundingBox())!;
      gutters.push(Math.round(second.x - (first.x + first.width)));
    }

    expect(gutters[1]).toBeGreaterThan(gutters[0]!);
  });
});
