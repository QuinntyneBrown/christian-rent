using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;

namespace ChristianRent.Application.Listings;

/// <summary>
/// The listings anyone may see: approved, and posted by a member who is not removed (L2-001,
/// criterion 2).
/// </summary>
internal static class PublicListings
{
    public static IQueryable<Listing> Of(IAppDbContext database) =>
        database.Listings.Where(listing =>
            listing.Status == ListingStatus.Approved &&
            database.Members.Any(member => member.Id == listing.MemberId && member.Status == MemberStatus.Active));
}
