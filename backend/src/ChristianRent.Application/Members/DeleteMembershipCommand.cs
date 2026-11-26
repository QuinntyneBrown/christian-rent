using ChristianRent.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// The member leaves (L2-028, criterion 2; handle-member-data design). Only a member may: anyone
/// else is refused with <c>not_a_member</c>.
/// </summary>
public sealed record DeleteMembershipCommand : IRequest;

internal sealed class DeleteMembershipCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<DeleteMembershipCommand>
{
    public async Task Handle(DeleteMembershipCommand command, CancellationToken cancellationToken)
    {
        var id = caller.RequireMember();
        var member = await database.Members.SingleAsync(member => member.Id == id, cancellationToken);
        member.Depart(clock.GetUtcNow());
        await database.SaveChangesAsync(cancellationToken);
    }
}
