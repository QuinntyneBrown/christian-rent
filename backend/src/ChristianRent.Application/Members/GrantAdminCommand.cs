using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// The operator makes an active member an admin, who may use Admin from their next request
/// (L2-019, criterion 23; ADR 0024). It answers whether the identifier is an active member's;
/// running it again changes nothing. Only <c>ChristianRent.Cli grant-admin</c> sends it: no
/// endpoint does.
/// </summary>
public sealed record GrantAdminCommand(Guid MemberId) : IRequest<bool>;

internal sealed class GrantAdminCommandHandler(IAppDbContext database) : IRequestHandler<GrantAdminCommand, bool>
{
    public async Task<bool> Handle(GrantAdminCommand command, CancellationToken cancellationToken)
    {
        var member = await database.Members.FirstOrDefaultAsync(
            member => member.Id == command.MemberId && member.Status == MemberStatus.Active, cancellationToken);
        if (member is null)
        {
            return false;
        }

        member.MakeAdmin();
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }
}
