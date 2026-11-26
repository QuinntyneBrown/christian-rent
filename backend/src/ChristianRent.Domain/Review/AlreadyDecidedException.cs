namespace ChristianRent.Domain.Review;

/// <summary>A review item that has a decision was decided again (L2-020, criterion 5).</summary>
public sealed class AlreadyDecidedException(ReviewDecision decision, DateTimeOffset decidedAt, Guid decidedBy)
    : InvalidOperationException("The review item is already decided.")
{
    /// <summary>The first decision, which stands.</summary>
    public ReviewDecision Decision { get; } = decision;

    public DateTimeOffset DecidedAt { get; } = decidedAt;

    public Guid DecidedBy { get; } = decidedBy;
}
