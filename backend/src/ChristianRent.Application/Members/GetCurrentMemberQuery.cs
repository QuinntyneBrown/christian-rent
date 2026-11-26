using ChristianRent.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>Who the signed-in person is as a member, or null when they are not one (become-member design).</summary>
public sealed record GetCurrentMemberQuery : IRequest<MemberDto?>;

internal sealed class GetCurrentMemberQueryHandler(IAppDbContext database, ICurrentMember caller)
    : IRequestHandler<GetCurrentMemberQuery, MemberDto?>
{
    public async Task<MemberDto?> Handle(GetCurrentMemberQuery request, CancellationToken cancellationToken)
    {
        if (caller.MemberId is not { } id)
        {
            return null;
        }

        var member = await database.Members.AsNoTracking().FirstOrDefaultAsync(member => member.Id == id, cancellationToken);
        return member is null ? null : JoinCommandHandler.ToDto(member);
    }
}
