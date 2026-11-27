using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Notices;

namespace ChristianRent.Infrastructure.Notices;

/// <summary>
/// Records each notice for the inbox to show once it is designed; nothing delivers it yet
/// (ADR 0025). The caller's save stores it with the decision.
/// </summary>
internal sealed class RecordedMemberNotifier(IAppDbContext database, TimeProvider clock) : IMemberNotifier
{
    public void ListingRemoved(Guid memberId, Guid listingId) =>
        database.MemberNotices.Add(MemberNotice.ListingRemoved(memberId, listingId, clock.GetUtcNow()));
}
