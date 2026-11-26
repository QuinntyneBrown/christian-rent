// Traces to: L2-007, L2-025
// Description: ListingVisibility, one case per row of who may see a listing.
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;

namespace ChristianRent.Api.Tests;

public sealed class ListingVisibilityTests
{
    private static readonly Guid PosterId = Guid.NewGuid();

    // L2-007 criterion 4: approved and posted by an active member, anyone; otherwise only the
    // poster and an admin.
    [Theory]
    [InlineData("approved", "active", "anyone", true)]
    [InlineData("approved", "active", "another member", true)]
    [InlineData("approved", "removed", "anyone", false)]
    [InlineData("approved", "removed", "admin", true)]
    [InlineData("waiting", "active", "anyone", false)]
    [InlineData("waiting", "active", "another member", false)]
    [InlineData("waiting", "active", "poster", true)]
    [InlineData("waiting", "active", "admin", true)]
    [InlineData("removed", "active", "anyone", false)]
    [InlineData("removed", "active", "poster", true)]
    [InlineData("removed", "active", "admin", true)]
    public void Who_may_see_a_listing(string status, string poster, string caller, bool expected)
    {
        var member = TestData.Member("The Okafor family", TestData.Grace, PosterId);
        var listing = TestData.ForRent(member, "Backyard garden for gatherings", status == "waiting" ? null : TestData.At(2));
        if (status == "removed")
        {
            listing.Remove();
        }

        var posterStatus = poster == "active" ? MemberStatus.Active : MemberStatus.Removed;
        Guid? callerId = caller switch
        {
            "poster" => PosterId,
            "another member" or "admin" => Guid.NewGuid(),
            _ => null,
        };

        Assert.Equal(expected, ListingVisibility.CanBeSeenBy(listing, posterStatus, callerId, callerIsAdmin: caller == "admin"));
    }
}
