using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// An admin confirms a church (verify-members-and-churches design; ADR 0031). <see cref="Id"/> is
/// the address's text. Who may ask is the controller's policy.
/// </summary>
public sealed record VerifyChurchCommand(string Id) : IRequest;

/// <summary>
/// Makes the church verified and records the admin and the time, once: confirming a verified
/// church changes nothing (L2-018, criteria 2 and 10). A church that does not exist is
/// <c>not_found</c> (criterion 11).
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
