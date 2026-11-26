using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Records an admin's decision on a waiting item and applies its effect, in one unit of work
/// (decide-review-item design; L2-020). A decision already made, a stale version or a save that
/// another admin's decision overtook is <c>already_decided</c>, and changes nothing (ADR 0025).
/// </summary>
internal sealed class DecideReviewItemCommandHandler(IAppDbContext database, ICurrentMember caller, IMemberNotifier notifier, TimeProvider clock)
    : IRequestHandler<DecideReviewItemCommand>
{
    public async Task Handle(DecideReviewItemCommand command, CancellationToken cancellationToken)
    {
        if (!caller.IsAdmin || caller.MemberId is not { } adminId)
        {
            throw new ForbiddenException("not_an_admin");
        }

        if (!Guid.TryParse(command.Id, out var id))
        {
            throw new NotFoundException();
        }

        var item = await database.ReviewItems.SingleOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundException();
        if (item.Decision is { } made)
        {
            throw new AlreadyDecidedException(ReviewWords.Of(made), item.DecidedAt!.Value);
        }

        var decision = ReviewWords.DecisionOf(command.Decision)!.Value;
        if (!item.Decisions.Contains(decision))
        {
            throw new ConflictException("decision_not_allowed");
        }

        var now = clock.GetUtcNow();
        item.Decide(decision, adminId, now);
        await ApplyAsync(item, decision, adminId, now, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);
    }

    /// <summary>The effect of each decision by kind, as the design's table gives it.</summary>
    private async Task ApplyAsync(ReviewItem item, ReviewDecision decision, Guid adminId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        switch (item.Kind, decision)
        {
            case (ReviewItemKind.NewListing, ReviewDecision.Approve):
                (await ListingAsync(item.SubjectId, cancellationToken)).Approve(now);
                break;

            case (ReviewItemKind.NewListing, ReviewDecision.Remove):
                await RemoveListingAsync(await ListingAsync(item.SubjectId, cancellationToken), item, adminId, now, cancellationToken);
                break;

            case (ReviewItemKind.Report, ReviewDecision.Keep):
                (await database.Reports.SingleAsync(report => report.Id == item.SubjectId, cancellationToken)).Close();
                break;

            case (ReviewItemKind.Report, ReviewDecision.Remove):
                var reported = await database.Reports.SingleAsync(report => report.Id == item.SubjectId, cancellationToken);
                await RemoveListingAsync(await ListingAsync(reported.ListingId, cancellationToken), item, adminId, now, cancellationToken);
                break;

            default:
                throw new ConflictException("decision_not_allowed");
        }
    }

    private Task<Domain.Listings.Listing> ListingAsync(Guid id, CancellationToken cancellationToken) =>
        database.Listings.SingleAsync(listing => listing.Id == id, cancellationToken);

    /// <summary>
    /// The listing stops being public, every open report on it is closed, every other waiting item
    /// about it is decided as Remove with the same admin and time, and the poster is told (L2-020,
    /// criteria 2 and 7).
    /// </summary>
    private async Task RemoveListingAsync(Domain.Listings.Listing listing, ReviewItem decided, Guid adminId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        listing.Remove();
        var reports = await database.Reports
            .Where(report => report.ListingId == listing.Id && report.Status == Domain.Reports.ReportStatus.Open)
            .ToListAsync(cancellationToken);
        var reportIds = reports.Select(report => report.Id).ToList();
        foreach (var report in reports)
        {
            report.Close();
        }

        var others = await database.ReviewItems
            .Where(other => other.Id != decided.Id && other.Decision == null && (
                (other.Kind == ReviewItemKind.NewListing && other.SubjectId == listing.Id) ||
                (other.Kind == ReviewItemKind.Report && reportIds.Contains(other.SubjectId))))
            .ToListAsync(cancellationToken);
        foreach (var other in others)
        {
            other.Decide(ReviewDecision.Remove, adminId, now);
        }

        notifier.ListingRemoved(listing.MemberId, listing.Id);
    }
}
