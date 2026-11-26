namespace ChristianRent.Domain.Listings;

/// <summary>
/// Where a listing is in the review queue. Only an approved listing is public (L2-001,
/// criterion 2).
/// </summary>
public enum ListingStatus
{
    WaitingForReview,
    Approved,
    Removed,
}
