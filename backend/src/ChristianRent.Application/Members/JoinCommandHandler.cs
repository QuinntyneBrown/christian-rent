using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// Makes the signed-in person a member who is not verified, and puts them in the review queue
/// as a new member, in one unit of work (L2-017, criterion 3).
/// </summary>
internal sealed class JoinCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<JoinCommand, JoinResult>
{
    public async Task<JoinResult> Handle(JoinCommand command, CancellationToken cancellationToken)
    {
        var signInId = caller.SignInId ?? throw new ForbiddenException("not_a_member");
        var now = clock.GetUtcNow();

        var church = await database.Churches.FirstOrDefaultAsync(church => church.Id == command.ChurchId, cancellationToken)
            ?? throw new NotFoundException();

        var member = Member.Join(signInId, MemberText.Clean(command.Name), church.Id, now);
        database.Members.Add(member);
        database.ReviewItems.Add(ReviewItem.ForNewMember(member.Id, now));
        await database.SaveChangesAsync(cancellationToken);
        return new JoinResult(ToDto(member), Created: true);
    }

    internal static MemberDto ToDto(Member member) => new(member.Id, member.Name, member.IsVerified, member.IsAdmin);
}
