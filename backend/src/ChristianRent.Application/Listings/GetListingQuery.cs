using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>
/// One listing, as the Listing screen shows it (read-listing design). <see cref="Id"/> is the
/// address as given: one that is not an identifier is answered as an unknown one (ADR 0015).
/// </summary>
public sealed record GetListingQuery(string Id) : IRequest<ListingDetailDto>;
