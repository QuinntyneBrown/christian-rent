using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>
/// Records an admin's decision on a review item, applies its effect to the subject, and saves
/// both in one unit of work (L2-020; decide-review-item design). Who may ask is the controller's
/// policy.
/// </summary>
internal sealed class DecideReviewItemCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
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
        await ApproveListingAsync(item.SubjectId, now, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);
        return new DecidedDto([item.Id]);
    }

    private async Task ApproveListingAsync(Guid listingId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var listing = await database.Listings.SingleAsync(listing => listing.Id == listingId, cancellationToken);
        listing.Approve(now);
    }
}
