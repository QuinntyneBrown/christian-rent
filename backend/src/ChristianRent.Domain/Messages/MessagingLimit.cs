namespace ChristianRent.Domain.Messages;

/// <summary>
/// At most <see cref="MaxPerWindow"/> messages per member in any hour (L2-016, criterion 4;
/// ADR 0022). Sending reopens when the twentieth most recent message of the window is an hour
/// old.
/// </summary>
public static class MessagingLimit
{
    public const int MaxPerWindow = 20;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);

    /// <summary>
    /// When the member may send again, given when their messages were sent; null when they may
    /// send now. A message sent exactly an hour ago no longer counts.
    /// </summary>
    public static DateTimeOffset? RetryAt(IEnumerable<DateTimeOffset> sentAt, DateTimeOffset now)
    {
        var recent = sentAt
            .Where(at => at > now - Window)
            .OrderByDescending(at => at)
            .Take(MaxPerWindow)
            .ToList();
        return recent.Count < MaxPerWindow ? null : recent[^1] + Window;
    }
}
