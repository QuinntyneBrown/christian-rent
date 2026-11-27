using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Application.Paging;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Reads one page of waiting review items by keyset, ordered by <c>CreatedAt</c> then <c>Id</c>,
/// both ascending, so the oldest is first (L2-019, criterion 1). It reads one row more than the
/// page to learn whether another follows, then the subjects of the page's rows, each kind at
/// once. Who may ask is the controller's policy.
/// </summary>
internal sealed class GetReviewQueueQueryHandler(IAppDbContext database, TimeProvider clock)
    : IRequestHandler<GetReviewQueueQuery, ReviewQueuePageDto>
{
    public async Task<ReviewQueuePageDto> Handle(GetReviewQueueQuery query, CancellationToken cancellationToken)
    {
        // Taken before anything is read, so an item that arrives during the reading is counted
        // as an arrival rather than lost.
        var asOf = clock.GetUtcNow();
        var waiting = WaitingReviewItems.Of(database);
        var waitingCount = await waiting.CountAsync(cancellationToken);

        if (query.Cursor is not null && KeysetCursor.TryDecode(query.Cursor, out var cursor))
        {
            waiting = waiting.Where(item =>
                item.CreatedAt > cursor.At ||
                (item.CreatedAt == cursor.At && item.Id.CompareTo(cursor.Id) > 0));
        }

        var rows = await waiting
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.Id)
            .Take(query.Size + 1)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var page = rows.Take(query.Size).ToList();
        var nextCursor = rows.Count > query.Size
            ? new KeysetCursor(page[^1].CreatedAt, page[^1].Id).Encode()
            : null;

        return new ReviewQueuePageDto(await SummariesAsync(page, cancellationToken), nextCursor, waitingCount, asOf);
    }

    private async Task<List<ReviewItemSummaryDto>> SummariesAsync(List<ReviewItem> page, CancellationToken cancellationToken)
    {
        var reportIds = SubjectsOf(page, ReviewItemKind.Report);
        var reported = await database.Reports.AsNoTracking()
            .Where(report => reportIds.Contains(report.Id))
            .Select(report => new { report.Id, report.ListingId })
            .ToDictionaryAsync(report => report.Id, report => report.ListingId, cancellationToken);

        var listingIds = SubjectsOf(page, ReviewItemKind.NewListing).Concat(reported.Values).ToList();
        var listings = await (
            from listing in database.Listings
            join member in database.Members on listing.MemberId equals member.Id
            where listingIds.Contains(listing.Id)
            select new { Listing = listing, member.Name })
            .AsNoTracking()
            .ToDictionaryAsync(row => row.Listing.Id, cancellationToken);

        var memberIds = SubjectsOf(page, ReviewItemKind.NewMember);
        var members = await (
            from member in database.Members
            join church in database.Churches on member.ChurchId equals church.Id
            where memberIds.Contains(member.Id)
            select new { member.Id, member.Name, ChurchName = church.Name })
            .AsNoTracking()
            .ToDictionaryAsync(row => row.Id, cancellationToken);

        return page.Select(item =>
        {
            if (item.Kind == ReviewItemKind.NewMember)
            {
                var member = members[item.SubjectId];
                return new ReviewItemSummaryDto(item.Id, ReviewWords.Of(item.Kind), member.Name, member.ChurchName, item.CreatedAt, null, null);
            }

            var row = listings[item.Kind == ReviewItemKind.Report ? reported[item.SubjectId] : item.SubjectId];
            return new ReviewItemSummaryDto(
                item.Id,
                ReviewWords.Of(item.Kind),
                row.Listing.Title,
                row.Name,
                item.CreatedAt,
                ListingWords.Of(row.Listing.Offer),
                ThumbOf(row.Listing));
        }).ToList();
    }

    private static List<Guid> SubjectsOf(List<ReviewItem> page, ReviewItemKind kind) =>
        page.Where(item => item.Kind == kind).Select(item => item.SubjectId).ToList();

    private static string? ThumbOf(Listing listing)
    {
        var first = listing.Offer == ListingOffer.ForRent
            ? listing.Photos.OrderBy(photo => photo.Position).FirstOrDefault()
            : null;
        return first is null ? null : PhotoRenditions.Url(first.PhotoId, PhotoRenditions.Thumb);
    }
}
