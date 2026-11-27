using ChristianRent.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// The member leaves (L2-028, criterion 2; handle-member-data design). Only a member may: anyone
/// else is refused with <c>not_a_member</c>. Every session of their account ends at its next
/// request; the account may sign in again and join as a new member (L2-040, criterion 5; ADR 0017).
/// </summary>
public sealed record DeleteMembershipCommand : IRequest;

internal sealed class DeleteMembershipCommandHandler(IAppDbContext database, ICurrentMember caller, IAccounts accounts, TimeProvider clock)
    : IRequestHandler<DeleteMembershipCommand>
{
    public async Task Handle(DeleteMembershipCommand command, CancellationToken cancellationToken)
    {
        var id = caller.RequireMember();
        var member = await database.Members.SingleAsync(member => member.Id == id, cancellationToken);
        var account = member.SignInId;
        member.Depart(clock.GetUtcNow());
        await database.SaveChangesAsync(cancellationToken);
        if (account is not null)
        {
            await accounts.EndSessionsAsync(account, cancellationToken);
        }
    }
}
