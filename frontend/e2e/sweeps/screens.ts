import type { Page } from '@playwright/test';
import type { ApiFixtures } from '../fixtures/api';
import { answerListing, gym, hall, office, van } from '../fixtures/listing';
import {
  answerListings,
  answerPhotos,
  cast,
  forRent,
  many,
  page as listingsPage,
  wanted,
} from '../fixtures/listings';
import { CHURCHES, answerJoining } from '../fixtures/members';

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
  {
    name: 'listing',
    path: `/listings/${hall().id}`,
    answer: (api) => answerListing(api, hall()),
    then: (page) => page.locator('.gallery__main img').waitFor(),
  },
  {
    name: 'listing-wanted',
    path: `/listings/${van().id}`,
    answer: (api) => answerListing(api, van()),
  },
  {
    name: 'listing-unverified',
    path: `/listings/${office().id}`,
    answer: (api) => answerListing(api, office()),
  },
  {
    name: 'listing-edge',
    path: `/listings/${gym().id}`,
    answer: (api) => answerListing(api, gym()),
    then: (page) => page.locator('.gallery__main img').waitFor(),
  },
  {
    name: 'listing-loading',
    path: `/listings/${hall().id}`,
    answer: (api) => {
      api.hold('GET', `/api/listings/${hall().id}`);
      answerListing(api, hall());
    },
    then: (page) => page.locator('.listing--loading').waitFor(),
  },
  {
    name: 'listing-error',
    path: `/listings/${hall().id}`,
    answer: (api) => api.refuse('GET', `/api/listings/${hall().id}`, 503, 'unexpected'),
  },
  {
    name: 'listing-not-found',
    path: `/listings/${hall().id}`,
    answer: (api) => api.refuse('GET', `/api/listings/${hall().id}`, 404, 'not_found'),
  },
  // The join dialog's states (docs/mocks/dialogs/join/), over the e2e build's host page.
  {
    name: 'join',
    path: '/dev/member-gate',
    answer: answerJoining,
    then: openJoin,
  },
  {
    name: 'join-new-church',
    path: '/dev/member-gate',
    answer: answerJoining,
    then: async (page) => {
      await openJoin(page);
      await page.getByLabel('Your church').selectOption({ label: 'My church isn’t listed' });
    },
  },
  {
    name: 'join-invalid',
    path: '/dev/member-gate',
    answer: answerJoining,
    then: async (page) => {
      await openJoin(page);
      await page.getByRole('button', { name: 'Become a member' }).click();
    },
  },
  {
    name: 'join-failed',
    path: '/dev/member-gate',
    answer: (api) => {
      answerJoining(api);
      api.refuse('POST', '/api/members', 503, 'unexpected');
    },
    then: async (page) => {
      await openJoin(page);
      await page.getByLabel('Your name').fill('Sarah Kim');
      await page
        .getByLabel('Your church')
        .selectOption({ label: 'Grace Community Church, Langley' });
      await page.getByRole('checkbox', { name: /I am a Christian/ }).check();
      await page.getByRole('button', { name: 'Become a member' }).click();
      await page.getByRole('alert').waitFor();
    },
  },
  {
    name: 'join-churches-failed',
    path: '/dev/member-gate',
    answer: (api) => {
      answerJoining(api);
      api.refuse('GET', '/api/churches', 503, 'unexpected');
    },
    then: async (page) => {
      await page.getByRole('button', { name: 'Post', exact: true }).click();
      await page.locator('#join-church-help').waitFor();
    },
  },
];

/** Opens the join dialog from the host page and waits for its churches. */
async function openJoin(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await page
    .getByLabel('Your church')
    .locator('option')
    .nth(CHURCHES.length + 1)
    .waitFor({ state: 'attached' });
}

export const WIDTHS = [320, 360, 576, 768, 992, 1200, 1440] as const;
