import type { Page } from '@playwright/test';
import type { ApiFixtures } from '../fixtures/api';
import {
  answerListings,
  answerPhotos,
  cast,
  forRent,
  many,
  page as listingsPage,
  wanted,
} from '../fixtures/listings';

/** One screen in one state: what the API answers, and what a person does before it is looked at. */
export interface Screen {
  readonly name: string;
  readonly path: string;
  readonly answer: (api: ApiFixtures) => void;
  readonly then?: (page: Page) => Promise<void>;
}

const scrollToEnd = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

/** The screens every sweep visits, in the states of their mocks. Each journey adds its own. */
export const SCREENS: readonly Screen[] = [
  {
    name: 'browse',
    path: '/',
    answer: (api) => {
      api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
      answerPhotos(api);
    },
  },
  {
    name: 'browse-loading',
    path: '/',
    answer: (api) => {
      api.hold('GET', '/api/listings');
      api.answer('GET', '/api/listings', { body: listingsPage(cast()) });
    },
    then: (page) => page.locator('ul[aria-busy="true"]').waitFor(),
  },
  {
    name: 'browse-empty',
    path: '/',
    answer: (api) => api.answer('GET', '/api/listings', { body: listingsPage([]) }),
  },
  {
    name: 'browse-error',
    path: '/',
    answer: (api) => api.refuse('GET', '/api/listings', 503, 'unexpected'),
  },
  {
    name: 'browse-more-error',
    path: '/',
    answer: (api) => {
      api.answer('GET', '/api/listings', (url) =>
        url.searchParams.has('cursor')
          ? {
              status: 503,
              body: { title: 'Refused', status: 503, code: 'unexpected' },
              headers: { 'content-type': 'application/problem+json' },
            }
          : { body: listingsPage(many(24), 'p2') },
      );
      answerPhotos(api);
    },
    then: async (page) => {
      await page.locator('a.listing-card').first().waitFor();
      await scrollToEnd(page);
      await page.locator('.feed-status[role="alert"]').waitFor();
    },
  },
  {
    name: 'browse-edge',
    path: '/',
    answer: (api) => {
      api.answer('GET', '/api/listings', {
        body: listingsPage([
          forRent('Gymnasium with a full-size hardwood court, bleachers and a kitchenette', {
            price: { amount: 1250.5, period: 'week' },
            area: 'Clayton Heights, Surrey',
            churchName: 'Fraser Valley Evangelical Missionary Fellowship',
          }),
          wanted('Wheelchair-accessible passenger van with a ramp for our seniors’ retreat', {
            price: { amount: 100000, period: 'month' },
            posterName: 'Bartholomew Oyelaran-Featherstonehaugh',
            churchName: 'Église Évangélique Baptiste de la Vallée du Fraser',
          }),
          forRent('Parking space', { photoName: null, price: { amount: 0, period: 'day' } }),
          wanted('Chairs', { when: { text: 'Any day this summer', start: null, end: null } }),
        ]),
      });
      answerPhotos(api);
    },
  },
  ...(
    [
      ['browse-for-rent', '/?show=for-rent'],
      ['browse-wanted', '/?show=wanted'],
      ['browse-spaces', '/?kind=space'],
      ['browse-no-results', '/?q=hot%20air%20balloon'],
    ] as const
  ).map(([name, path]): Screen => ({
    name,
    path,
    answer: (api) => {
      answerListings(api, cast());
      answerPhotos(api);
    },
  })),
  {
    name: 'not-found',
    path: '/no-such-page',
    answer: () => undefined,
  },
];

export const WIDTHS = [320, 360, 576, 768, 992, 1200, 1440] as const;
