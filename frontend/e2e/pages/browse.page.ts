import type { Locator, Page } from '@playwright/test';
import { ListingCardPart } from './listing-card.part';
import { SiteHeaderPart } from './site-header.part';

/** Browse, the home screen. */
export class BrowsePage {
  readonly header: SiteHeaderPart;
  readonly skipLink: Locator;
  readonly main: Locator;
  readonly heading: Locator;
  readonly hero: Locator;
  readonly haveSomethingToRent: Locator;
  readonly lookingForSomething: Locator;
  /** The visually hidden line that announces the number of listings. */
  readonly count: Locator;
  readonly grid: Locator;
  readonly cards: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyHaveSomethingToRent: Locator;
  readonly emptyLookingForSomething: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgain: Locator;
  /** What follows the last card while a further page loads, or after it failed. */
  readonly feedStatus: Locator;
  readonly loadMoreAgain: Locator;
  /** The switch: Everything, For rent and Wanted, each a link with its count. */
  readonly switch: Locator;
  readonly switchOptions: Locator;
  readonly switchCurrent: Locator;

  constructor(private readonly page: Page) {
    this.header = new SiteHeaderPart(page);
    this.skipLink = page.locator('.skip-link');
    this.main = page.locator('main#main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.hero = this.main.locator('.hero');
    this.haveSomethingToRent = this.hero.getByRole('link', { name: 'I have something to rent' });
    this.lookingForSomething = this.hero.getByRole('link', { name: 'I’m looking for something' });
    this.count = this.main.locator('p.visually-hidden[role="status"]');
    this.grid = this.main.locator('ul.listing-grid');
    this.cards = this.grid.locator('a.listing-card');
    this.skeletons = this.main.locator('ul.listing-grid[aria-busy="true"] > li');
    this.empty = this.main.locator('.no-results');
    this.emptyTitle = this.empty.getByRole('heading', { level: 2 });
    this.emptyHaveSomethingToRent = this.empty.getByRole('link', {
      name: 'I have something to rent',
    });
    this.emptyLookingForSomething = this.empty.getByRole('link', {
      name: 'I’m looking for something',
    });
    this.error = this.main.locator('.empty--error');
    this.errorTitle = this.error.getByRole('heading', { level: 2 });
    this.errorText = this.error.locator('.empty__text');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.feedStatus = this.main.locator('.feed-status');
    this.loadMoreAgain = this.feedStatus.getByRole('button', { name: 'Try again' });
    this.switch = this.main.getByRole('navigation', { name: 'Show', exact: true });
    this.switchOptions = this.switch.locator('a.segmented__option');
    this.switchCurrent = this.switch.locator('a.segmented__option[aria-current="true"]');
  }

  /** The switch's option named `name` ("Everything", "For rent" or "Wanted"). */
  switchOption(name: 'Everything' | 'For rent' | 'Wanted'): Locator {
    return this.switchOptions.filter({ hasText: new RegExp(`^${name}\\b`) });
  }

  /** The count an option of the switch shows, empty while there is none. */
  switchCount(name: 'Everything' | 'For rent' | 'Wanted'): Locator {
    return this.switchOption(name).locator('.segmented__count');
  }

  /** Opens Browse at an address such as `/?show=wanted`, as a reload or a shared link does. */
  async openAt(address: string): Promise<void> {
    await this.page.goto(address);
  }

  /** The address's query, for example `?show=for-rent`. */
  query(): string {
    return new URL(this.page.url()).search;
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  card(index: number): ListingCardPart {
    return new ListingCardPart(this.cards.nth(index));
  }

  cardTitled(title: string): ListingCardPart {
    return new ListingCardPart(
      this.cards.filter({
        has: this.page.getByRole('heading', { level: 2, name: title, exact: true }),
      }),
    );
  }

  /** Scrolls to the end of the list, as a person reaching it does. */
  async scrollToEnd(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
