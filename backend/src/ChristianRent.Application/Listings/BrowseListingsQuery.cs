using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>
/// One page of approved listings, newest first (L2-001, L2-006). <see cref="Cursor"/> is the
/// <c>nextCursor</c> of the page before. <see cref="Show"/> is the switch: <c>for-rent</c>,
/// <c>wanted</c>, or null for everything (L2-002).
/// </summary>
public sealed record BrowseListingsQuery(string? Cursor, int Size = BrowseListingsQuery.DefaultSize, string? Show = null) : IRequest<ListingsPageDto>
{
    public const int DefaultSize = 24;
    public const int MaxSize = 50;
}
