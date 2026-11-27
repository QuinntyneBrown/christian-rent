import type {
  ReportReason,
  ReviewDetailView,
  ReviewFactView,
  ReviewItemDetail,
  ReviewListing,
  ReviewListingView,
  ReviewMember,
  ReviewMemberView,
  ReviewReport,
} from '@rent/api';
import { formatPrice } from '../listings/format-price';
import { decisionLabel } from './decision-words';
import { formatWhen } from '../listings/format-when';
import { avatarTint, initialsOf } from '../listings/member-name';
import { formatInstant, formatInstantDay, formatMonth, formatWaiting } from './review-words';

/** What a report's reason is called over the listing, after "Reported". */
const REASONS: Record<ReportReason, string> = {
  fake: 'as not a real listing',
  inappropriate: 'as inappropriate',
  scam: 'as a scam',
  other: 'for something else',
};

/**
 * Everything the detail panel shows to decide on an item (L2-019, criteria 2, 7 to 9 and 15 to
 * 17): a new listing, a reported one with what the report says over it, or a new member.
 * Member-written text passes through as text: the screen never renders it as HTML. `now` is
 * passed in, so the rule needs no clock.
 */
export function toReviewDetailView(detail: ReviewItemDetail, now: Date): ReviewDetailView {
  const decisions = detail.allowedDecisions.map((decision) => ({
    decision,
    label: decisionLabel(decision),
  }));
  switch (detail.kind) {
    case 'new-listing':
      return { ...listingView(detail.listing!), decisions };
    case 'report':
      return { ...reportView(detail.report!, now), decisions };
    case 'new-member':
      return { ...memberView(detail.member!), decisions };
  }
}

/** A listing or a member written without what may be decided, which the item says. */
type Subject<T> = Omit<T, 'decisions'>;

function listingView(listing: ReviewListing): Subject<ReviewListingView> {
  const wanted = listing.offer === 'wanted';
  const price = formatPrice(listing.price, listing.offer);
  return {
    type: 'listing',
    report: null,
    wanted,
    // A photo nobody has described is described by the title and its position (ADR 0016).
    photos: wanted
      ? []
      : listing.photos.map((photo, index, all) => ({
          url: photo.url,
          alt: photo.description ?? `${listing.title}, photo ${index + 1} of ${all.length}`,
        })),
    title: listing.title,
    price: price === null ? null : [price.amount, price.per].filter(Boolean).join(' '),
    tag: `${wanted ? 'Wanted' : 'For rent'} · ${listing.kind}`,
    note: listing.note?.trim() ? listing.note : null,
    facts: [...listingFacts(listing), fact('Posted', formatInstant(listing.postedAt))],
    siteHref: null,
  };
}

/** A reported listing is public: it says since when, and can be opened on the site. */
function reportView(report: ReviewReport, now: Date): Subject<ReviewListingView> {
  const waited = formatWaiting(report.reportedAt, now);
  const by = ` by a member, ${waited === 'just now' ? waited : `${waited} ago`}`;
  return {
    ...listingView(report.listing),
    report: {
      headline: `Reported ${REASONS[report.reason]}`,
      rest: report.note === null ? `${by}.` : `${by}: “${report.note}”`,
    },
    facts: [
      ...listingFacts(report.listing),
      fact('Public since', formatInstantDay(report.publicSince)),
    ],
    siteHref: `/listings/${report.listing.id}`,
  };
}

function memberView(member: ReviewMember): Subject<ReviewMemberView> {
  const initials = initialsOf(member.name);
  return {
    type: 'member',
    initials,
    tint: avatarTint(initials),
    name: member.name,
    joined: `Joined ${formatInstant(member.joinedAt)}`,
    facts: [
      fact('Name', member.name),
      fact('Church', `${member.church.name}, ${member.church.city}`),
      // Joining takes this declaration (L2-017), so every member has made it.
      fact('Declared', '“I am a Christian”'),
      {
        ...fact('Church status', churchStatus(member.church)),
        churchStatus: { confirmable: !member.church.isVerified },
      },
      fact('Listings', listingsOf(member)),
      fact('Messages sent', member.messageCount === 0 ? 'None' : String(member.messageCount)),
    ],
  };
}

function churchStatus(church: ReviewMember['church']): string {
  if (church.isVerified) {
    return 'Verified';
  }
  if (church.enteredBy === null) {
    return 'Not verified';
  }
  const by = church.enteredBy.isThisMember ? 'this member' : church.enteredBy.name;
  return `New to christian.rent, entered by ${by}`;
}

/** "1 wanted listing, public", "2 listings for rent, not public yet", "3 listings, 2 public". */
function listingsOf(member: ReviewMember): string {
  const { listingCount: all, forRentCount: forRent, publicCount } = member;
  if (all === 0) {
    return 'None';
  }
  const noun = all === 1 ? 'listing' : 'listings';
  const what = forRent === all ? `${noun} for rent` : forRent === 0 ? `wanted ${noun}` : noun;
  const open =
    publicCount === all ? 'public' : publicCount === 0 ? 'not public yet' : `${publicCount} public`;
  return `${all} ${what}, ${open}`;
}

/** The facts of a listing and of who posted it; one with nothing to say is left out. */
function listingFacts(listing: ReviewListing): ReviewFactView[] {
  const { poster } = listing;
  const when = formatWhen(listing.when);
  return [
    fact('Posted by', poster.name, poster.isVerified ? 'member' : null),
    fact('Church', poster.church.name, poster.church.isVerified ? 'church' : null),
    ...(when === null ? [] : [fact('When', when)]),
    fact('Where', listing.area),
    fact('Member since', formatMonth(poster.joinedAt)),
  ];
}

function fact(
  term: string,
  value: string,
  verified: ReviewFactView['verified'] = null,
): ReviewFactView {
  return { term, value, verified };
}
