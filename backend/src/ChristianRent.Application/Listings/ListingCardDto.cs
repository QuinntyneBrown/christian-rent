namespace ChristianRent.Application.Listings;

/// <summary>
/// One listing as a card on Browse (browse-listings design). <c>Offer</c> is <c>for-rent</c> or
/// <c>wanted</c>, <c>Kind</c> is <c>space</c> or <c>thing</c>, and <c>DistanceKm</c> is null until
/// a person's area is designed (ADR 0012).
/// </summary>
public sealed record ListingCardDto(
    Guid Id,
    string Offer,
    string Kind,
    string Title,
    PriceDto? Price,
    string Area,
    int? DistanceKm,
    WhenDto When,
    string PosterName,
    string ChurchName,
    PhotoRefDto? Photo);

/// <summary>Canadian dollars per <c>hour</c>, <c>day</c>, <c>week</c> or <c>month</c>.</summary>
public sealed record PriceDto(decimal Amount, string Period);

/// <summary>"When" in words, or a start and an end date; the screen formats it (L2-022).</summary>
public sealed record WhenDto(string? Text, DateOnly? Start, DateOnly? End);

/// <summary>A rendition's address and size, and the photo's text alternative (ADR 0011).</summary>
public sealed record PhotoRefDto(string Url, int Width, int Height, string? Description);

/// <summary>At most one page of cards, the cursor of the next page, and the counts.</summary>
public sealed record ListingsPageDto(IReadOnlyList<ListingCardDto> Items, string? NextCursor, ListingCountsDto Counts);

/// <summary>How many approved listings there are of each offer.</summary>
public sealed record ListingCountsDto(int Everything, int ForRent, int Wanted);
