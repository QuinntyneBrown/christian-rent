namespace ChristianRent.Domain.Review;

/// <summary>
/// One entry of the review queue, pointing at its subject by <see cref="Kind"/> and
/// <see cref="SubjectId"/> (view-review-queue design). An admin ends its wait with one decision,
/// which stands (decide-review-item design); an item is never deleted for being decided.
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

    /// <summary>What an admin decided; null while the item waits.</summary>
    public ReviewDecision? Decision { get; private set; }

    /// <summary>The admin who decided; with <see cref="DecidedAt"/> and <see cref="Decision"/>, the record (L2-020, criterion 6).</summary>
    public Guid? DecidedBy { get; private set; }

    public DateTimeOffset? DecidedAt { get; private set; }

    /// <summary>Raised by each change; the concurrency token that guards a decision (ADR 0026).</summary>
    public int Version { get; private set; }

    /// <summary>What may be decided about an item of a kind: the decision table (L2-020).</summary>
    public static IReadOnlyList<ReviewDecision> AllowedDecisions(ReviewItemKind kind) => kind switch
    {
        ReviewItemKind.Report => [ReviewDecision.Keep, ReviewDecision.Remove],
        _ => [ReviewDecision.Approve, ReviewDecision.Remove],
    };

    /// <summary>
    /// Records who decided what and when (L2-020, criterion 6), once: a second decision raises
    /// <see cref="AlreadyDecidedException"/> and the first stands (criterion 5).
    /// </summary>
    public void Decide(ReviewDecision decision, Guid adminId, DateTimeOffset now)
    {
        if (Decision is not null)
        {
            throw new AlreadyDecidedException();
        }

        Decision = decision;
        DecidedBy = adminId;
        DecidedAt = now;
        Version++;
    }

    /// <summary>An item with a known identifier, as seed data enters them.</summary>
    public static ReviewItem Create(Guid id, ReviewItemKind kind, Guid subjectId, DateTimeOffset createdAt) =>
        new(id, kind, subjectId, createdAt);

    /// <summary>A new listing waits for an admin to approve it (L2-012, criterion 1).</summary>
    public static ReviewItem ForNewListing(Guid listingId, DateTimeOffset now) =>
        new(Guid.NewGuid(), ReviewItemKind.NewListing, listingId, now);

    /// <summary>A member's report waits for an admin to keep or remove the listing (L2-021, criterion 2).</summary>
    public static ReviewItem ForReport(Guid reportId, DateTimeOffset now) =>
        new(Guid.NewGuid(), ReviewItemKind.Report, reportId, now);

    /// <summary>A new member waits for an admin to verify them (L2-017, criterion 3).</summary>
    public static ReviewItem ForNewMember(Guid memberId, DateTimeOffset now) =>
        new(Guid.NewGuid(), ReviewItemKind.NewMember, memberId, now);
}
