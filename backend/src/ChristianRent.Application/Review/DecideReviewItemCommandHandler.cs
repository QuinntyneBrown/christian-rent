using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Records an admin's decision on a review item, applies its effect to the subject, and saves
/// both in one unit of work (L2-020; decide-review-item design). Who may ask is the controller's
/// policy.
/// </summary>
internal sealed class DecideReviewItemCommandHandler(
    IAppDbContext database, ICurrentMember caller, IMemberNotifier notifier, TimeProvider clock)
    : IRequestHandler<DecideReviewItemCommand, DecidedDto>
{
    public async Task<DecidedDto> Handle(DecideReviewItemCommand command, CancellationToken cancellationToken)
    {
        var adminId = caller.RequireMember();
        var decision = ReviewWords.DecisionOf(command.Decision)!.Value;
        if (!Guid.TryParse(command.Id, out var id))
        {
            throw new NotFoundException();
        }

        var item = await database.ReviewItems.SingleOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundException();
        var now = clock.GetUtcNow();
        item.Decide(decision, adminId, now);
        var closed = new List<ReviewItem> { item };
        switch (item.Kind)
        {
            case ReviewItemKind.NewListing:
                var listing = await ListingAsync(item.SubjectId, cancellationToken);
                if (decision == ReviewDecision.Approve)
                {
                    listing.Approve(now);
                }
                else
                {
                    closed.AddRange(await RemoveAsync(listing, item, adminId, now, cancellationToken));
                }

                break;
            case ReviewItemKind.Report:
                var report = await database.Reports.SingleAsync(report => report.Id == item.SubjectId, cancellationToken);
                report.Close();
                if (decision == ReviewDecision.Remove)
                {
                    var reported = await ListingAsync(report.ListingId, cancellationToken);
                    closed.AddRange(await RemoveAsync(reported, item, adminId, now, cancellationToken));
                }

                break;
        }

        await database.SaveChangesAsync(cancellationToken);
        return new DecidedDto(closed.Select(decided => decided.Id).ToList());
    }

    private Task<Listing> ListingAsync(Guid id, CancellationToken cancellationToken) =>
        database.Listings.SingleAsync(listing => listing.Id == id, cancellationToken);

    /// <summary>
    /// Takes the listing down: every other item still waiting about it is decided Remove with the
    /// one decided, each report on it is closed, and its poster has one notice (L2-020,
    /// criteria 7 and 20). Answers the other items it decided.
    /// </summary>
    private async Task<IReadOnlyList<ReviewItem>> RemoveAsync(
        Listing listing, ReviewItem decided, Guid adminId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        listing.Remove();
        var reports = await database.Reports.Where(report => report.ListingId == listing.Id).ToListAsync(cancellationToken);
        var reportIds = reports.Select(report => report.Id).ToList();
        var others = await database.ReviewItems
            .Where(item => item.Id != decided.Id && item.Decision == null
                && ((item.Kind == ReviewItemKind.Report && reportIds.Contains(item.SubjectId))
                    || (item.Kind == ReviewItemKind.NewListing && item.SubjectId == listing.Id)))
            .ToListAsync(cancellationToken);
        foreach (var other in others)
        {
            other.Decide(ReviewDecision.Remove, adminId, now);
        }

        foreach (var report in reports)
        {
            report.Close();
        }

        await notifier.ListingRemovedAsync(listing.MemberId, listing.Id, cancellationToken);
        return others;
    }
}
