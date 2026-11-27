using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// Confirms a church, which marks it on every listing of its members at their next read
/// (L2-018, criterion 2). One that does not exist is <c>not_found</c>. Who may ask is the
/// controller's policy.
/// </summary>
internal sealed class VerifyChurchCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<VerifyChurchCommand>
{
    public async Task Handle(VerifyChurchCommand command, CancellationToken cancellationToken)
    {
        var adminId = caller.RequireMember();
        if (!Guid.TryParse(command.Id, out var id))
        {
            throw new NotFoundException();
        }

        var church = await database.Churches.SingleOrDefaultAsync(church => church.Id == id, cancellationToken)
            ?? throw new NotFoundException();
        church.Verify(adminId, clock.GetUtcNow());
        await database.SaveChangesAsync(cancellationToken);
    }
}
