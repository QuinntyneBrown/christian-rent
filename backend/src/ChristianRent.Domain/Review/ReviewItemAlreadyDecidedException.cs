namespace ChristianRent.Domain.Review;

/// <summary>The item was decided before; the first decision stands (L2-020, criterion 5).</summary>
public sealed class ReviewItemAlreadyDecidedException(ReviewDecision decision, DateTimeOffset decidedAt)
    : InvalidOperationException("The review item was already decided.")
{
    public ReviewDecision Decision { get; } = decision;

    public DateTimeOffset DecidedAt { get; } = decidedAt;
}
