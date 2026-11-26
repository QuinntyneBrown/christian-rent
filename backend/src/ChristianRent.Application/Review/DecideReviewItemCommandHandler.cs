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
internal sealed class DecideReviewItemCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
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
        await ApplyAsync(item, decision, now, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyAsync(ReviewItem item, ReviewDecision decision, DateTimeOffset now, CancellationToken cancellationToken)
    {
        switch (item.Kind, decision)
        {
            case (ReviewItemKind.NewListing, ReviewDecision.Approve):
                var listing = await database.Listings.SingleAsync(listing => listing.Id == item.SubjectId, cancellationToken);
                listing.Approve(now);
                break;

            default:
                throw new ConflictException("decision_not_allowed");
        }
    }
}
