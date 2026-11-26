namespace ChristianRent.Application.Listings;

/// <summary>
/// One listing on the Listing screen (read-listing design). <c>PostedAt</c> is when the member
/// posted it, <c>DistanceKm</c> is null until a person's area is designed (ADR 0012), and
/// <c>IsOwn</c> is true for its poster.
/// </summary>
public sealed record ListingDetailDto(
    Guid Id,
    string Offer,
    string Kind,
    string Title,
    PriceDto? Price,
    WhenDto When,
    string Area,
    int? DistanceKm,
    string? Note,
    DateTimeOffset PostedAt,
    IReadOnlyList<ListingPhotoDto> Photos,
    PosterDto Poster,
    bool IsOwn);

/// <summary>
/// A photo in the gallery: its <c>gallery</c> rendition, the size of that rendition, its
/// <c>thumb</c> rendition, and its text alternative when it has one (ADR 0011, ADR 0015).
/// </summary>
public sealed record ListingPhotoDto(string Url, string ThumbUrl, int Width, int Height, string? Description);

/// <summary>
/// Who posted the listing. It has no email address, phone number, street address or
/// identifier, so none can be sent (L2-008, criterion 5).
/// </summary>
public sealed record PosterDto(string Name, bool IsVerified, int MemberSince, ChurchDto Church);

/// <summary>The church the poster belongs to, and whether an admin has confirmed it.</summary>
public sealed record ChurchDto(string Name, bool IsVerified);
