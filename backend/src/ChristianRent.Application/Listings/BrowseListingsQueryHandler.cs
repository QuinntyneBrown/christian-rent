using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Listings;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Listings;

/// <summary>
/// Reads one page by keyset: approved listings whose poster is not removed, ordered by
/// <c>ApprovedAt</c> then <c>Id</c>, both descending (ADR 0013). It reads one row more than the
/// page to learn whether another page follows.
/// </summary>
internal sealed class BrowseListingsQueryHandler(IAppDbContext database) : IRequestHandler<BrowseListingsQuery, ListingsPageDto>
{
    public async Task<ListingsPageDto> Handle(BrowseListingsQuery query, CancellationToken cancellationToken)
    {
        var listings = PublicListings.Of(database);

        // Every word has to appear; each reaches the database as a parameter (ADR 0015).
        foreach (var word in SearchNormalizer.Words(query.Search))
        {
            listings = listings.Where(listing => listing.SearchText.Contains(word));
        }

        if (ListingWords.KindOf(query.Kind) is { } kind)
        {
            listings = listings.Where(listing => listing.Kind == kind);
        }

        var counted = listings;
        if (ListingWords.OfferOf(query.Show) is { } offer)
        {
            listings = listings.Where(listing => listing.Offer == offer);
        }

        var cards =
            from listing in listings
            join member in database.Members on listing.MemberId equals member.Id
            join church in database.Churches on member.ChurchId equals church.Id
            select new { listing, member.Name, ChurchName = church.Name };

        if (query.Cursor is not null && ListingCursor.TryDecode(query.Cursor, out var cursor))
        {
            cards = cards.Where(card =>
                card.listing.ApprovedAt < cursor.ApprovedAt ||
                (card.listing.ApprovedAt == cursor.ApprovedAt && card.listing.Id.CompareTo(cursor.Id) < 0));
        }

        var rows = await cards
            .OrderByDescending(card => card.listing.ApprovedAt)
            .ThenByDescending(card => card.listing.Id)
            .Take(query.Size + 1)
            .Select(card => new
            {
                card.listing.Id,
                card.listing.Offer,
                card.listing.Kind,
                card.listing.Title,
                card.listing.Price,
                card.listing.WhenText,
                card.listing.StartDate,
                card.listing.EndDate,
                card.listing.Area,
                card.listing.ApprovedAt,
                PosterName = card.Name,
                card.ChurchName,
                Photo = card.listing.Photos
                    .OrderBy(photo => photo.Position)
                    .Select(photo => new { photo.PhotoId, photo.Description })
                    .FirstOrDefault(),
            })
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var page = rows.Take(query.Size).ToList();
        var nextCursor = rows.Count > query.Size
            ? new ListingCursor(page[^1].ApprovedAt!.Value, page[^1].Id).Encode()
            : null;

        var (width, height) = PhotoRenditions.Sizes[PhotoRenditions.Card];
        var items = page
            .Select(row => new ListingCardDto(
                row.Id,
                ListingWords.Of(row.Offer),
                ListingWords.Of(row.Kind),
                row.Title,
                row.Price is null ? null : new PriceDto(row.Price.Amount, ListingWords.Of(row.Price.Period)),
                row.Area,
                DistanceKm: null,
                new WhenDto(row.WhenText, row.StartDate, row.EndDate),
                row.PosterName,
                row.ChurchName,
                row.Offer == ListingOffer.ForRent && row.Photo is not null
                    ? new PhotoRefDto(PhotoRenditions.Url(row.Photo.PhotoId, PhotoRenditions.Card), width, height, row.Photo.Description)
                    : null))
            .ToList();

        return new ListingsPageDto(items, nextCursor, await CountAsync(counted, cancellationToken));
    }

    /// <summary>What each option of the switch holds, whatever the switch shows (L2-002, criterion 6).</summary>
    private static async Task<ListingCountsDto> CountAsync(IQueryable<Listing> listings, CancellationToken cancellationToken)
    {
        var counts = await listings
            .GroupBy(listing => listing.Offer)
            .Select(group => new { Offer = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);
        var forRent = counts.Where(count => count.Offer == ListingOffer.ForRent).Sum(count => count.Count);
        var wanted = counts.Where(count => count.Offer == ListingOffer.Wanted).Sum(count => count.Count);
        return new ListingCountsDto(forRent + wanted, forRent, wanted);
    }
}
