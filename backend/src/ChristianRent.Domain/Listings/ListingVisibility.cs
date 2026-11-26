using ChristianRent.Domain.Members;

namespace ChristianRent.Domain.Listings;

/// <summary>
/// Who may see a listing (L2-007, criterion 4; L2-025, criterion 2): anyone, once it is approved
/// and its poster is active; otherwise only its poster and an admin.
/// </summary>
public static class ListingVisibility
{
    public static bool CanBeSeenBy(Listing listing, MemberStatus posterStatus, Guid? callerId, bool callerIsAdmin) =>
        (listing.Status == ListingStatus.Approved && posterStatus == MemberStatus.Active) ||
        callerIsAdmin ||
        (callerId is { } id && id == listing.MemberId);
}
