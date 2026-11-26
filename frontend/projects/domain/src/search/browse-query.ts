import type { ListingKind, ListingOffer, ListingsFilter } from '@rent/api';

/** The longest search term that is used (L2-003, criterion 4). */
export const MAX_TERM_LENGTH = 100;

/** The switch: everything, or one offer (L2-002). */
export type BrowseOffer = 'everything' | ListingOffer;

/** The kind filter: all, or one kind (L2-035). */
export type BrowseKind = 'all' | ListingKind;

/** The query parameters Browse's address holds, as the router reads them. */
export interface QueryParamReader {
  get(name: string): string | null;
}

const OFFERS: readonly BrowseOffer[] = ['everything', 'for-rent', 'wanted'];
const KINDS: readonly BrowseKind[] = ['all', 'space', 'thing'];

/**
 * What Browse shows: the switch, the kind filter and the search term (search-and-filter
 * design). It is read from the address and written back to it, so the address is the single
 * source of the choice (L2-002, criterion 5; L2-035, criterion 5; ADR 0015): `show`, `kind`
 * and `q`, each omitted when it is the default. The term is kept as typed, cut to its first
 * 100 characters, and trimmed only in the request.
 */
export class BrowseQuery {
  constructor(
    readonly offer: BrowseOffer = 'everything',
    readonly kind: BrowseKind = 'all',
    readonly term = '',
  ) {}

  /** The query an address holds; a value the switch or the filter does not have is the default. */
  static fromParams(params: QueryParamReader): BrowseQuery {
    const show = params.get('show');
    const kind = params.get('kind');
    return new BrowseQuery(
      OFFERS.find((offer) => offer === show) ?? 'everything',
      KINDS.find((each) => each === kind) ?? 'all',
    ).withTerm(params.get('q') ?? '');
  }

  /** The query parameters, without the defaults; the plain address is everything. */
  toParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.offer !== 'everything') {
      params['show'] = this.offer;
    }
    if (this.kind !== 'all') {
      params['kind'] = this.kind;
    }
    if (this.term.trim() !== '') {
      params['q'] = this.term;
    }
    return params;
  }

  withOffer(offer: BrowseOffer): BrowseQuery {
    return new BrowseQuery(offer, this.kind, this.term);
  }

  withKind(kind: BrowseKind): BrowseQuery {
    return new BrowseQuery(this.offer, kind, this.term);
  }

  /** The term as typed, cut to its first 100 characters. */
  withTerm(term: string): BrowseQuery {
    return new BrowseQuery(this.offer, this.kind, term.slice(0, MAX_TERM_LENGTH));
  }

  /** What the request sends. */
  filter(): ListingsFilter {
    return {
      offer: this.offer === 'everything' ? null : this.offer,
      kind: this.kind === 'all' ? null : this.kind,
      term: this.term.trim(),
    };
  }

  /** True when both send the same request. */
  equals(other: BrowseQuery): boolean {
    return this.sameChoices(other) && this.filter().term === other.filter().term;
  }

  /** True when the switch and the kind filter are the same, whatever the term. */
  sameChoices(other: BrowseQuery): boolean {
    return this.offer === other.offer && this.kind === other.kind;
  }
}
