using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Review;

namespace ChristianRent.Application.Review;

/// <summary>
/// The items that wait in the review queue: those with no decision whose subject is still
/// there. An item whose listing, report or member has gone, as the purge leaves them, is neither
/// listed nor counted (ADR 0024).
/// </summary>
internal static class WaitingItems
{
    public static IQueryable<ReviewItem> Of(IAppDbContext database) =>
        database.ReviewItems.Where(item => item.Decision == null && (
            (item.Kind == ReviewItemKind.NewListing && database.Listings.Any(listing => listing.Id == item.SubjectId)) ||
            (item.Kind == ReviewItemKind.Report && database.Reports.Any(report => report.Id == item.SubjectId)) ||
            (item.Kind == ReviewItemKind.NewMember && database.Members.Any(member => member.Id == item.SubjectId))));
}
