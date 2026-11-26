using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>
/// One page of approved listings, newest first (L2-001, L2-006). <see cref="Cursor"/> is the
/// <c>nextCursor</c> of the page before. <see cref="Show"/> is the switch: <c>for-rent</c>,
/// <c>wanted</c>, or null for everything (L2-002). <see cref="Kind"/> is <c>space</c>,
/// <c>thing</c>, or null for both (L2-035). <see cref="Search"/> is the search term, whose first
/// 100 characters are used (L2-003).
/// </summary>
public sealed record BrowseListingsQuery(
    string? Cursor,
    int Size = BrowseListingsQuery.DefaultSize,
    string? Show = null,
    string? Search = null,
    string? Kind = null) : IRequest<ListingsPageDto>
{
    public const int DefaultSize = 24;
    public const int MaxSize = 50;
}
