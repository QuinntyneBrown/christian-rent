namespace ChristianRent.Domain.Review;

/// <summary>
/// One entry of the review queue, pointing at its subject by <see cref="Kind"/> and
/// <see cref="SubjectId"/> (view-review-queue design). Journeys 10 and 11 add the decision.
/// </summary>
public sealed class ReviewItem
{
    private ReviewItem(Guid id, ReviewItemKind kind, Guid subjectId, DateTimeOffset createdAt)
    {
        Id = id;
        Kind = kind;
        SubjectId = subjectId;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public ReviewItemKind Kind { get; private set; }

    /// <summary>The listing, report or member the item is about, by <see cref="Kind"/>.</summary>
    public Guid SubjectId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A new member waits for an admin to verify them (L2-017, criterion 3).</summary>
    public static ReviewItem ForNewMember(Guid memberId, DateTimeOffset now) =>
        new(Guid.NewGuid(), ReviewItemKind.NewMember, memberId, now);
}
