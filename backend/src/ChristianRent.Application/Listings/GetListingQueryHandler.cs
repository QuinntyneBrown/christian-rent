using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Listings;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Listings;

/// <summary>
/// Reads one listing by its identifier with its poster, church and photos, then asks
/// <see cref="ListingVisibility"/>. A listing that does not exist and one the caller may not see
/// are answered alike, <c>not_found</c>, so nothing about it is revealed (L2-007, criterion 4).
/// </summary>
internal sealed class GetListingQueryHandler(IAppDbContext database, ICurrentMember caller) : IRequestHandler<GetListingQuery, ListingDetailDto>
{
    public async Task<ListingDetailDto> Handle(GetListingQuery query, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(query.Id, out var id))
        {
            throw new NotFoundException();
        }

        var row = await (
            from found in database.Listings
            join member in database.Members on found.MemberId equals member.Id
            join church in database.Churches on member.ChurchId equals church.Id
            where found.Id == id
            select new { Listing = found, Member = member, Church = church })
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);

        if (row is null || !ListingVisibility.CanBeSeenBy(row.Listing, row.Member.Status, caller.MemberId, caller.IsAdmin))
        {
            throw new NotFoundException();
        }

        var listing = row.Listing;
        var reportedAt = caller.MemberId is { } memberId
            ? await database.Reports.AsNoTracking()
                .Where(report => report.ListingId == id && report.ReporterId == memberId)
                .Select(report => (DateTimeOffset?)report.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
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

        return new ListingDetailDto(
            listing.Id,
            ListingWords.Of(listing.Offer),
            ListingWords.Of(listing.Kind),
            listing.Title,
            listing.Price is null ? null : new PriceDto(listing.Price.Amount, ListingWords.Of(listing.Price.Period)),
            new WhenDto(listing.WhenText, listing.StartDate, listing.EndDate),
            listing.Area,
            DistanceKm: null,
            listing.Note,
            listing.CreatedAt,
            photos,
            new PosterDto(
                row.Member.Name,
                row.Member.IsVerified,
                row.Member.JoinedAt.Year,
                new ChurchDto(row.Church.Name, row.Church.IsVerified)),
            IsOwn: caller.MemberId == listing.MemberId,
            ReportedAt: reportedAt);
    }
}
