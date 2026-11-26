using ChristianRent.Application.Listings;

namespace ChristianRent.Application.Review;

/// <summary>
/// The position after the last item of a page of the review queue: its creation time and
/// identifier, encoded as Browse's cursor is (ADR 0013, ADR 0024).
/// </summary>
public readonly record struct ReviewCursor(DateTimeOffset CreatedAt, Guid Id)
{
    public string Encode() => new ListingCursor(CreatedAt, Id).Encode();

    /// <summary>Reads a cursor this type encoded; anything else is refused.</summary>
    public static bool TryDecode(string text, out ReviewCursor cursor)
    {
        var read = ListingCursor.TryDecode(text, out var position);
        cursor = new ReviewCursor(position.ApprovedAt, position.Id);
        return read;
    }
}
