using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Application.Review;

/// <summary>
/// The review items that still wait: those not decided (L2-020) whose subject still waits
/// (L2-019, criterion 18; ADR 0024).
/// A new listing waits for review and its poster is active; a report is open on a public
/// listing; a new member is active. What a subject has lost since, such as the listings of a
/// member who left, is not for an admin to decide.
/// </summary>
internal static class WaitingReviewItems
{
    public static IQueryable<ReviewItem> Of(IAppDbContext database)
    {
        var publicListings = PublicListings.Of(database);
        return database.ReviewItems.Where(item => item.Decision == null && (
            (item.Kind == ReviewItemKind.NewListing && database.Listings.Any(listing =>
                listing.Id == item.SubjectId &&
                listing.Status == ListingStatus.WaitingForReview &&
                database.Members.Any(member => member.Id == listing.MemberId && member.Status == MemberStatus.Active))) ||
            (item.Kind == ReviewItemKind.Report && database.Reports.Any(report =>
                report.Id == item.SubjectId &&
                report.Status == ReportStatus.Open &&
                publicListings.Any(listing => listing.Id == report.ListingId))) ||
            (item.Kind == ReviewItemKind.NewMember && database.Members.Any(member =>
                member.Id == item.SubjectId && member.Status == MemberStatus.Active))));
    }
}
