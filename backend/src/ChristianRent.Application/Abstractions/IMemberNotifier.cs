namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Tells a member what an admin did to their listing (decide-review-item design). It takes part
/// in the caller's unit of work: the notice is saved with the decision or not at all (ADR 0025).
/// </summary>
public interface IMemberNotifier
{
    /// <summary>The member who posted a listing is told that it was removed (L2-020, criterion 7).</summary>
    void ListingRemoved(Guid memberId, Guid listingId);
}
