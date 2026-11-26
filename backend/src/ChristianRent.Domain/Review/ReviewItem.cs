namespace ChristianRent.Domain.Review;

/// <summary>
/// One entry of the review queue, pointing at its subject by <see cref="Kind"/> and
/// <see cref="SubjectId"/> (view-review-queue design). It waits until an admin decides it once;
/// the decision, who made it and when stay recorded, and the item is never deleted (L2-020,
/// criterion 6). <see cref="Version"/> changes with the decision, so a second admin's is refused
/// (ADR 0025).
/// </summary>
public sealed class ReviewItem
{
    private ReviewItem(Guid id, ReviewItemKind kind, Guid subjectId, DateTimeOffset createdAt)
    {
        Id = id;
        Kind = kind;
        SubjectId = subjectId;
        CreatedAt = createdAt;
        Version = Guid.NewGuid();
    }

    public Guid Id { get; private set; }

    public ReviewItemKind Kind { get; private set; }

    /// <summary>The listing, report or member the item is about, by <see cref="Kind"/>.</summary>
    public Guid SubjectId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public ReviewDecision? Decision { get; private set; }

    /// <summary>The admin who decided it.</summary>
    public Guid? DecidedById { get; private set; }

    public DateTimeOffset? DecidedAt { get; private set; }

    /// <summary>A concurrency token: every decision changes it (ADR 0025).</summary>
    public Guid Version { get; private set; }

    /// <summary>
    /// What its kind allows (L2-020, criterion 8): Keep or Remove for a report, Approve or Remove
    /// for a new listing and a new member.
    /// </summary>
    public IReadOnlyList<ReviewDecision> Decisions => Kind == ReviewItemKind.Report
        ? [ReviewDecision.Keep, ReviewDecision.Remove]
        : [ReviewDecision.Approve, ReviewDecision.Remove];

    /// <summary>
    /// Records the decision with the admin and the time. A second decision is refused and the
    /// first stands (L2-020, criterion 5); the caller checks <see cref="Decisions"/> first.
    /// </summary>
    public void Decide(ReviewDecision decision, Guid adminId, DateTimeOffset now)
    {
        if (Decision is { } made)
        {
            throw new ReviewItemAlreadyDecidedException(made, DecidedAt!.Value);
        }

        if (!Decisions.Contains(decision))
        {
            throw new ArgumentOutOfRangeException(nameof(decision), decision, "The item's kind does not allow this decision.");
        }

        Decision = decision;
        DecidedById = adminId;
        DecidedAt = now;
        Version = Guid.NewGuid();
    }

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
