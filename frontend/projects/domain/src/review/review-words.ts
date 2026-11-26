import type {
  ReviewDetailView,
  ReviewFact,
  ReviewItemDetail,
  ReviewListing,
  ReviewListingView,
  ReviewMember,
  ReviewMemberView,
  ReviewReport,
  ReviewReportReason,
} from '@rent/api';
import { DECISION_LABELS } from './decision-words';
import { formatPrice } from '../listings/format-price';
import { formatTime } from '../listings/format-retry-at';
import { formatDay, formatWhen } from '../listings/format-when';
import { avatarTint, initialsOf } from '../listings/member-name';
import { formatWaited } from './queue-words';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A report's reason as the detail leads with it (ADR 0024). */
export const REPORTED_AS: Readonly<Record<ReviewReportReason, string>> = {
  scam: 'Reported as a scam',
  fake: 'Reported as not a real listing',
  inappropriate: 'Reported as inappropriate',
  other: 'Reported for something else',
};

/** "Apr 2025": the month and year someone joined, in the browser's time zone. */
export function formatMonth(instant: string): string {
  const date = new Date(instant);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Jun 6, 2026": the day of an instant, in the browser's time zone. */
export function formatDate(instant: string): string {
  const date = new Date(instant);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "Jun 8, 2026, 9:12 a.m.". */
export function formatDateTime(instant: string): string {
  return `${formatDate(instant)}, ${formatTime(new Date(instant))}`;
}

/** When, as the detail says it: a start with no end is "From Jul 1, 2026". */
export function reviewWhen(when: ReviewListing['when']): string | null {
  if (!when.text?.trim() && when.start !== null && when.end === null) {
    const day = formatDay(when.start);
    return day === null ? null : `From ${day}`;
  }
  return formatWhen(when);
}

/**
 * A new member's listings (ADR 0024): "None", or by offer and how many are public, such as "1
 * wanted listing, public" or "2 listings for rent, 1 public".
 */
export function memberListings(listings: ReviewMember['listings']): string {
  const total = listings.forRent + listings.wanted;
  if (total === 0) {
    return 'None';
  }
  const parts: string[] = [];
  if (listings.forRent > 0) {
    parts.push(`${listings.forRent} ${listings.forRent === 1 ? 'listing' : 'listings'} for rent`);
  }
  if (listings.wanted > 0) {
    parts.push(`${listings.wanted} wanted ${listings.wanted === 1 ? 'listing' : 'listings'}`);
  }
  return `${parts.join(' and ')}, ${publicWords(listings.public, total)}`;
}

function publicWords(shown: number, total: number): string {
  if (total === 1) {
    return shown === 1 ? 'public' : 'not public';
  }
  return shown === total ? 'all public' : `${shown} public`;
}

/** "None", "1 message", "3 messages". */
export function messagesSent(count: number): string {
  if (count === 0) {
    return 'None';
  }
  return `${count} ${count === 1 ? 'message' : 'messages'}`;
}

/** The church's status on a new member's detail (ADR 0024). */
export function churchStatus(church: ReviewMember['church']): string {
  if (church.isVerified) {
    return 'Verified';
  }
  if (church.enteredByThisMember) {
    return 'New to christian.rent, entered by this member';
  }
  return church.enteredByName === null
    ? 'New to christian.rent'
    : `New to christian.rent, entered by ${church.enteredByName}`;
}

/** The report's sentence after its reason: "by a member, 40 min ago: “…”" (ADR 0024). */
export function reportRest(report: ReviewReport, now: Date): string {
  const waited = formatWaited(report.reportedAt, now);
  const ago = waited === 'just now' ? waited : `${waited} ago`;
  const note = report.note?.trim();
  return note ? `by a member, ${ago}: “${note}”` : `by a member, ${ago}.`;
}

/** The detail panel's content for an item (L2-019, criteria 2, 7, 8 and 9). */
export function toReviewDetailView(detail: ReviewItemDetail, now: Date): ReviewDetailView | null {
  const decisions = detail.decisions.map((decision) => ({
    decision,
    label: DECISION_LABELS[decision],
  }));
  if (detail.member !== null) {
    return { ...memberView(detail.member), decisions };
  }
  return detail.listing === null
    ? null
    : { ...listingView(detail.listing, detail.report, now), decisions };
}

function listingView(
  listing: ReviewListing,
  report: ReviewReport | null,
  now: Date,
): Omit<ReviewListingView, 'decisions'> {
  const price = formatPrice(listing.price, listing.offer);
  const when = reviewWhen(listing.when);
  const offer = listing.offer === 'wanted' ? 'Wanted' : 'For rent';
  const facts: ReviewFact[] = [
    fact('Posted by', listing.poster.name, listing.poster.isVerified ? 'member' : null),
    fact('Church', listing.poster.church.name, listing.poster.church.isVerified ? 'church' : null),
    ...(when === null ? [] : [fact('When', when)]),
    fact('Where', listing.area),
    fact('Member since', formatMonth(listing.poster.memberSince)),
    report !== null && listing.approvedAt !== null
      ? fact('Public since', formatDate(listing.approvedAt))
      : fact('Posted', formatDateTime(listing.postedAt)),
  ];
  return {
    kind: 'listing',
    report:
      report === null
        ? null
        : { reason: REPORTED_AS[report.reason], rest: reportRest(report, now) },
    media: mediaOf(listing),
    title: listing.title,
    price: price === null ? null : [price.amount, price.per].filter(Boolean).join(' '),
    tag: `${offer} · ${listing.kind}`,
    note: listing.note,
    facts,
    siteUrl: listing.approvedAt === null ? null : `/listings/${listing.id}`,
  };
}

function mediaOf(listing: ReviewListing): ReviewListingView['media'] {
  if (listing.offer === 'wanted') {
    return { kind: 'wanted' };
  }
  const photo = listing.photos[0];
  if (photo === undefined) {
    return { kind: 'no-photo' };
  }
  return {
    kind: 'photo',
    url: photo.url,
    alt: photo.description?.trim() || `${listing.title}, photo 1 of ${listing.photos.length}`,
    width: photo.width,
    height: photo.height,
  };
}

function memberView(member: ReviewMember): Omit<ReviewMemberView, 'decisions'> {
  const initials = initialsOf(member.name);
  return {
    kind: 'member',
    name: member.name,
    initials,
    tint: avatarTint(initials),
    joined: `Joined ${formatDateTime(member.joinedAt)}`,
    facts: [
      fact('Name', member.name),
      fact('Church', `${member.church.name}, ${member.church.city}`),
      fact('Declared', '“I am a Christian”'),
      fact('Church status', churchStatus(member.church)),
      fact('Listings', memberListings(member.listings)),
      fact('Messages sent', messagesSent(member.messagesSent)),
    ],
  };
}

function fact(name: string, value: string, verified: ReviewFact['verified'] = null): ReviewFact {
  return { name, value, verified };
}
