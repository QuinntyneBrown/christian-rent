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
/// Reads a waiting item and its subject by kind (L2-019, criteria 2 and 7 to 9). An unknown
/// item and one whose subject has gone are answered alike, <c>not_found</c> (ADR 0024).
/// </summary>
internal sealed class GetReviewItemQueryHandler(IAppDbContext database, ICurrentMember caller)
    : IRequestHandler<GetReviewItemQuery, ReviewItemDetailDto>
{
    public async Task<ReviewItemDetailDto> Handle(GetReviewItemQuery query, CancellationToken cancellationToken)
    {
        if (!caller.IsAdmin)
        {
            throw new ForbiddenException("not_an_admin");
        }

        if (!Guid.TryParse(query.Id, out var id))
        {
            throw new NotFoundException();
        }

        var item = await WaitingItems.Of(database).AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundException();

        var kind = ReviewWords.Of(item.Kind);
        var decisions = item.Decisions.Select(ReviewWords.Of).ToList();
        switch (item.Kind)
        {
            case ReviewItemKind.NewListing:
                return new ReviewItemDetailDto(item.Id, kind, decisions, item.CreatedAt, await ListingAsync(item.SubjectId, cancellationToken), null, null);

            case ReviewItemKind.Report:
                var report = await database.Reports.AsNoTracking().SingleAsync(report => report.Id == item.SubjectId, cancellationToken);
                return new ReviewItemDetailDto(
                    item.Id,
                    kind,
                    decisions,
                    item.CreatedAt,
                    await ListingAsync(report.ListingId, cancellationToken),
                    new ReviewReportDto(ReportWords.Of(report.Reason), report.Note, report.CreatedAt),
                    null);

            default:
                return new ReviewItemDetailDto(item.Id, kind, decisions, item.CreatedAt, null, null, await MemberAsync(item.SubjectId, cancellationToken));
        }
    }

    private async Task<ReviewListingDto> ListingAsync(Guid listingId, CancellationToken cancellationToken)
    {
        var row = await (
            from found in database.Listings
            join member in database.Members on found.MemberId equals member.Id
            join church in database.Churches on member.ChurchId equals church.Id
            where found.Id == listingId
            select new { Listing = found, Member = member, Church = church })
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException();

        var listing = row.Listing;
        var (width, height) = PhotoRenditions.Sizes[PhotoRenditions.Gallery];
        var photos = listing.Offer == ListingOffer.ForRent
            ? listing.Photos
                .OrderBy(photo => photo.Position)
                .Select(photo => new ListingPhotoDto(
                    PhotoRenditions.Url(photo.PhotoId, PhotoRenditions.Gallery),
                    PhotoRenditions.Url(photo.PhotoId, PhotoRenditions.Thumb),
                    width,
                    height,
                    photo.Description))
                .ToList()
            : [];

        return new ReviewListingDto(
            listing.Id,
            ListingWords.Of(listing.Offer),
            ListingWords.Of(listing.Kind),
            listing.Title,
            listing.Price is null ? null : new PriceDto(listing.Price.Amount, ListingWords.Of(listing.Price.Period)),
            new WhenDto(listing.WhenText, listing.StartDate, listing.EndDate),
            listing.Area,
            listing.Note,
            listing.CreatedAt,
            listing.ApprovedAt,
            photos,
            new ReviewPosterDto(
                row.Member.Name,
                row.Member.IsVerified,
                row.Member.JoinedAt,
                new ChurchDto(row.Church.Name, row.Church.IsVerified)));
    }

    private async Task<ReviewMemberDto> MemberAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var row = await (
            from member in database.Members
            join church in database.Churches on member.ChurchId equals church.Id
            where member.Id == memberId
            select new { Member = member, Church = church })
            .AsNoTracking()
            .SingleAsync(cancellationToken);

        var enteredByName = row.Church.EnteredById is { } enteredById
            ? await database.Members.AsNoTracking()
                .Where(member => member.Id == enteredById)
                .Select(member => member.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var listings = await database.Listings.AsNoTracking()
            .Where(listing => listing.MemberId == memberId)
            .GroupBy(listing => new { listing.Offer, listing.Status })
            .Select(group => new { group.Key.Offer, group.Key.Status, Count = group.Count() })
            .ToListAsync(cancellationToken);
        var messagesSent = await database.Messages.AsNoTracking()
            .CountAsync(message => message.SenderId == memberId, cancellationToken);

        return new ReviewMemberDto(
            row.Member.Name,
            row.Member.JoinedAt,
            new ReviewChurchDto(
                row.Church.Name,
                row.Church.City,
                row.Church.IsVerified,
                EnteredByThisMember: row.Church.EnteredById == memberId,
                enteredByName),
            new ReviewMemberListingsDto(
                listings.Where(group => group.Offer == ListingOffer.ForRent).Sum(group => group.Count),
                listings.Where(group => group.Offer == ListingOffer.Wanted).Sum(group => group.Count),
                listings.Where(group => group.Status == ListingStatus.Approved).Sum(group => group.Count)),
            messagesSent);
    }
}
