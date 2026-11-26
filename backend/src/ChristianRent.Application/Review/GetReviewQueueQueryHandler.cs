using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Reads one page of the waiting items by keyset, ordered by <c>CreatedAt</c> then <c>Id</c>,
/// both ascending, so the oldest is first (L2-019, criterion 1; ADR 0024). It reads one row more
/// than the page to learn whether another page follows, then the page's subjects.
/// </summary>
internal sealed class GetReviewQueueQueryHandler(IAppDbContext database, ICurrentMember caller)
    : IRequestHandler<GetReviewQueueQuery, ReviewQueuePageDto>
{
    public async Task<ReviewQueuePageDto> Handle(GetReviewQueueQuery query, CancellationToken cancellationToken)
    {
        if (!caller.IsAdmin)
        {
            throw new ForbiddenException("not_an_admin");
        }

        var waiting = WaitingItems.Of(database);
        var paged = waiting;
        if (query.Cursor is not null && ReviewCursor.TryDecode(query.Cursor, out var cursor))
        {
            paged = paged.Where(item =>
                item.CreatedAt > cursor.CreatedAt ||
                (item.CreatedAt == cursor.CreatedAt && item.Id.CompareTo(cursor.Id) > 0));
        }

        var rows = await paged
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.Id)
            .Take(GetReviewQueueQuery.Size + 1)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var page = rows.Take(GetReviewQueueQuery.Size).ToList();
        var nextCursor = rows.Count > GetReviewQueueQuery.Size
            ? new ReviewCursor(page[^1].CreatedAt, page[^1].Id).Encode()
            : null;

        var subjects = await SubjectsAsync(page, cancellationToken);
        var items = page.Select(subjects.Summary).ToList();
        return new ReviewQueuePageDto(items, nextCursor, await waiting.CountAsync(cancellationToken));
    }

    private async Task<Subjects> SubjectsAsync(List<ReviewItem> page, CancellationToken cancellationToken)
    {
        var reportIds = IdsOf(page, ReviewItemKind.Report);
        var reports = await database.Reports.AsNoTracking()
            .Where(report => reportIds.Contains(report.Id))
            .ToDictionaryAsync(report => report.Id, report => report.ListingId, cancellationToken);

        var listingIds = IdsOf(page, ReviewItemKind.NewListing).Concat(reports.Values).Distinct().ToList();
        var listings = await (
            from listing in database.Listings
            join member in database.Members on listing.MemberId equals member.Id
            where listingIds.Contains(listing.Id)
            select new ListingRow(
                listing.Id,
                listing.Title,
                listing.Offer,
                member.Name,
                listing.Photos.OrderBy(photo => photo.Position).Select(photo => (Guid?)photo.PhotoId).FirstOrDefault()))
            .AsNoTracking()
            .ToDictionaryAsync(row => row.Id, cancellationToken);

        var memberIds = IdsOf(page, ReviewItemKind.NewMember);
        var members = await (
            from member in database.Members
            join church in database.Churches on member.ChurchId equals church.Id
            where memberIds.Contains(member.Id)
            select new MemberRow(member.Id, member.Name, church.Name))
            .AsNoTracking()
            .ToDictionaryAsync(row => row.Id, cancellationToken);

        return new Subjects(reports, listings, members);
    }

    private static List<Guid> IdsOf(List<ReviewItem> page, ReviewItemKind kind) =>
        page.Where(item => item.Kind == kind).Select(item => item.SubjectId).ToList();

    private sealed record ListingRow(Guid Id, string Title, ListingOffer Offer, string PosterName, Guid? PhotoId);

    private sealed record MemberRow(Guid Id, string Name, string ChurchName);

    private sealed record Subjects(
        Dictionary<Guid, Guid> ReportListings,
        Dictionary<Guid, ListingRow> Listings,
        Dictionary<Guid, MemberRow> Members)
    {
        public ReviewItemSummaryDto Summary(ReviewItem item)
        {
            if (item.Kind == ReviewItemKind.NewMember)
            {
                var member = Members[item.SubjectId];
                return new ReviewItemSummaryDto(
                    item.Id, ReviewWords.Of(item.Kind), member.Name, member.ChurchName, item.CreatedAt, Offer: null, ThumbUrl: null);
            }

            var listingId = item.Kind == ReviewItemKind.Report ? ReportListings[item.SubjectId] : item.SubjectId;
            var listing = Listings[listingId];
            var thumb = listing.Offer == ListingOffer.ForRent && listing.PhotoId is { } photoId
                ? PhotoRenditions.Url(photoId, PhotoRenditions.Thumb)
                : null;
            return new ReviewItemSummaryDto(
                item.Id, ReviewWords.Of(item.Kind), listing.Title, listing.PosterName, item.CreatedAt, ListingWords.Of(listing.Offer), thumb);
        }
    }
}
