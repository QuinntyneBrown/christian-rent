using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Notices;

namespace ChristianRent.Infrastructure.Persistence;

/// <summary>
/// Records a notice and sends nothing: how a member is told is not designed yet (ADR 0025).
/// </summary>
internal sealed class RecordedMemberNotifier(IAppDbContext database, TimeProvider clock) : IMemberNotifier
{
    public Task ListingRemovedAsync(Guid memberId, Guid listingId, CancellationToken cancellationToken)
    {
        database.ListingRemovalNotices.Add(ListingRemovalNotice.Record(memberId, listingId, clock.GetUtcNow()));
        return Task.CompletedTask;
    }
}
