namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Tells a member what an admin's decision means for them (decide-review-item design). It joins
/// the decision's unit of work: it does not save.
/// </summary>
public interface IMemberNotifier
{
    /// <summary>The member's listing was removed (L2-020, criteria 7 and 20). Nothing names a reporter.</summary>
    Task ListingRemovedAsync(Guid memberId, Guid listingId, CancellationToken cancellationToken);
}
