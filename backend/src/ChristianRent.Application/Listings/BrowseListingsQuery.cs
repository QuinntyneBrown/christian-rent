using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>
/// One page of approved listings, newest first (L2-001, L2-006). <see cref="Cursor"/> is the
/// <c>nextCursor</c> of the page before; search-and-filter adds the offer, the kind and the
/// search term.
/// </summary>
public sealed record BrowseListingsQuery(string? Cursor, int Size = BrowseListingsQuery.DefaultSize) : IRequest<ListingsPageDto>
{
    public const int DefaultSize = 24;
    public const int MaxSize = 50;
}
