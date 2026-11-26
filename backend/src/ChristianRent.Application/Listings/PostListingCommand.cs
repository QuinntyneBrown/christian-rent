using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>
/// A member posts a listing (publish-listing design). <see cref="Offer"/>, <see cref="Kind"/>
/// and <see cref="PricePeriod"/> are the API's words (<see cref="ListingWords"/>); "when" is
/// <see cref="WhenText"/> or the two dates. <see cref="ClientRequestId"/> makes a repeated
/// submission the same listing (L2-012, criterion 4).
/// </summary>
public sealed record PostListingCommand(
    Guid? ClientRequestId,
    string? Offer,
    string? Kind,
    string? Title,
    decimal? PriceAmount,
    string? PricePeriod,
    string? WhenText,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Area,
    string? Note,
    IReadOnlyList<Guid>? PhotoIds) : IRequest<PostListingResult>;

/// <summary>The listing and whether this request created it or an earlier one with the same identifier did.</summary>
public sealed record PostListingResult(PostedListingDto Listing, bool Created);

/// <summary>What the API answers about a posted listing: it waits for review.</summary>
public sealed record PostedListingDto(Guid Id, string Status);
