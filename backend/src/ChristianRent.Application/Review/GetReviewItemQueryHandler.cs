using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using ChristianRent.Application.Reports;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Reads one waiting review item with its subject. An item that does not exist and one whose
/// subject no longer waits are <c>not_found</c> (L2-019, criteria 18 and 21). Who may ask is the
/// controller's policy.
/// </summary>
internal sealed class GetReviewItemQueryHandler(IAppDbContext database) : IRequestHandler<GetReviewItemQuery, ReviewItemDetailDto>
{
    public async Task<ReviewItemDetailDto> Handle(GetReviewItemQuery query, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(query.Id, out var id))
        {
            throw new NotFoundException();
        }

        var item = await WaitingReviewItems.Of(database).AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundException();

        var detail = new ReviewItemDetailDto(
            item.Id, ReviewWords.Of(item.Kind), item.CreatedAt, null, null, null,
            item.Version, ReviewItem.AllowedDecisions(item.Kind).Select(ReviewWords.Of).ToList());
        return item.Kind switch
        {
            ReviewItemKind.NewListing => detail with { Listing = (await ListingAsync(item.SubjectId, cancellationToken)).Listing },
            ReviewItemKind.Report => detail with { Report = await ReportAsync(item.SubjectId, cancellationToken) },
            ReviewItemKind.NewMember => detail with { Member = await MemberAsync(item.SubjectId, cancellationToken) },
            _ => throw new InvalidOperationException($"Unknown review item kind {item.Kind}."),
        };
    }

    private async Task<(ReviewListingDto Listing, DateTimeOffset? ApprovedAt)> ListingAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await (
            from listing in database.Listings
            join member in database.Members on listing.MemberId equals member.Id
            join church in database.Churches on member.ChurchId equals church.Id
            where listing.Id == id
            select new { Listing = listing, Member = member, Church = church })
            .AsNoTracking()
            .SingleAsync(cancellationToken);

        var found = row.Listing;
        var photos = found.Offer == ListingOffer.ForRent
            ? found.Photos
                .OrderBy(photo => photo.Position)
                .Select(photo => new ReviewPhotoDto(
                    PhotoRenditions.AdminUrl(photo.PhotoId, PhotoRenditions.Gallery),
                    PhotoRenditions.AdminUrl(photo.PhotoId, PhotoRenditions.Thumb),
                    photo.Description))
                .ToList()
            : [];

        var shown = new ReviewListingDto(
            found.Id,
            ListingWords.Of(found.Offer),
            ListingWords.Of(found.Kind),
            found.Title,
            found.Price is null ? null : new PriceDto(found.Price.Amount, ListingWords.Of(found.Price.Period)),
            new WhenDto(found.WhenText, found.StartDate, found.EndDate),
            found.Area,
            found.Note,
            photos,
            new ReviewPosterDto(
                row.Member.Name,
                row.Member.IsVerified,
                row.Member.JoinedAt,
                new ChurchDto(row.Church.Name, row.Church.IsVerified)),
            found.CreatedAt);
        return (shown, found.ApprovedAt);
    }

    private async Task<ReportDetailDto> ReportAsync(Guid id, CancellationToken cancellationToken)
    {
        // The reporter is not read: nothing here can carry them to the answer (L2-021, criterion 4).
        var report = await database.Reports.AsNoTracking()
            .Where(report => report.Id == id)
            .Select(report => new { report.ListingId, report.Reason, report.Note, report.CreatedAt })
            .SingleAsync(cancellationToken);
        var (listing, approvedAt) = await ListingAsync(report.ListingId, cancellationToken);

        // A waiting report is on a public listing, which has been approved.
        return new ReportDetailDto(ReportWords.Of(report.Reason), report.Note, report.CreatedAt, approvedAt!.Value, listing);
    }

    private async Task<NewMemberDetailDto> MemberAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await (
            from member in database.Members
            join church in database.Churches on member.ChurchId equals church.Id
            where member.Id == id
            select new { member.Name, member.JoinedAt, Church = church })
            .AsNoTracking()
            .SingleAsync(cancellationToken);

        var entrant = row.Church.EnteredById is { } entrantId
            ? await database.Members.AsNoTracking()
                .Where(member => member.Id == entrantId)
                .Select(member => new ChurchEntrantDto(member.Name, entrantId == id))
                .SingleOrDefaultAsync(cancellationToken)
            : null;

        var listings = await database.Listings.AsNoTracking()
            .Where(listing => listing.MemberId == id && listing.Status != ListingStatus.Removed)
            .Select(listing => new { listing.Offer, listing.Status })
            .ToListAsync(cancellationToken);
        var messageCount = await database.Messages.CountAsync(message => message.SenderId == id, cancellationToken);

        return new NewMemberDetailDto(
            row.Name,
            row.JoinedAt,
            new NewMemberChurchDto(row.Church.Name, row.Church.City, row.Church.IsVerified, entrant),
            listings.Count,
            listings.Count(listing => listing.Offer == ListingOffer.ForRent),
            listings.Count(listing => listing.Status == ListingStatus.Approved),
            messageCount);
    }
}
