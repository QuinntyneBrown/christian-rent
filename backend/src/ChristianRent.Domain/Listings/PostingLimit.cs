namespace ChristianRent.Domain.Listings;

/// <summary>
/// At most <see cref="MaxPerWindow"/> listings per member in any 24 hours (L2-012, criterion 6;
/// publish-listing design). Posting reopens when the tenth most recent listing of the window is
/// 24 hours old.
/// </summary>
public static class PostingLimit
{
    public const int MaxPerWindow = 10;

    public static readonly TimeSpan Window = TimeSpan.FromHours(24);

    /// <summary>
    /// When the member may post again, given when their listings were created; null when they
    /// may post now. A listing created exactly 24 hours ago no longer counts.
    /// </summary>
    public static DateTimeOffset? RetryAt(IEnumerable<DateTimeOffset> createdAt, DateTimeOffset now)
    {
        var recent = createdAt
            .Where(at => at > now - Window)
            .OrderByDescending(at => at)
            .Take(MaxPerWindow)
            .ToList();
        return recent.Count < MaxPerWindow ? null : recent[^1] + Window;
    }
}
