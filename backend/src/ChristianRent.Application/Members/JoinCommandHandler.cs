using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using FluentValidation;
using FluentValidation.Results;
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
        var existing = await database.Members.FirstOrDefaultAsync(member => member.SignInId == signInId, cancellationToken);
        if (existing is not null)
        {
            // Joining twice creates nothing (L2-017, criterion 14); a removed member cannot join
            // again as the same person (L2-018, criterion 4; ADR 0017).
            return existing.Status == MemberStatus.Active
                ? new JoinResult(await DtoOfAsync(database, existing, cancellationToken), Created: false)
                : throw new ForbiddenException("not_a_member");
        }

        var now = clock.GetUtcNow();

        var (church, isNew) = await ChurchOfAsync(command, cancellationToken);
        var member = Member.Join(signInId, MemberText.Clean(command.Name), church.Id, now);
        if (isNew)
        {
            church.RecordEnteredBy(member.Id);
        }

        database.Members.Add(member);
        database.ReviewItems.Add(ReviewItem.ForNewMember(member.Id, now));
        await database.SaveChangesAsync(cancellationToken);
        return new JoinResult(ToDto(member, church.Name), Created: true);
    }

    /// <summary>The chosen church, or the new one: an existing church when its key matches (ADR 0018).</summary>
    private async Task<(Church Church, bool IsNew)> ChurchOfAsync(JoinCommand command, CancellationToken cancellationToken)
    {
        if (command.ChurchId is { } id)
        {
            var chosen = await database.Churches.FirstOrDefaultAsync(church => church.Id == id, cancellationToken)
                ?? throw new ValidationException([new ValidationFailure(nameof(JoinCommand.ChurchId), JoinCommandValidator.ChurchMessage)]);
            return (chosen, false);
        }

        var name = MemberText.Clean(command.NewChurchName);
        var city = MemberText.Clean(command.NewChurchCity);
        var key = ChurchMatch.KeyOf(name, city);
        var existing = await database.Churches.FirstOrDefaultAsync(church => church.MatchKey == key, cancellationToken);
        if (existing is not null)
        {
            return (existing, false);
        }

        var entered = Church.Enter(name, city);
        database.Churches.Add(entered);
        return (entered, true);
    }

    internal static MemberDto ToDto(Member member, string churchName) =>
        new(member.Id, member.Name, churchName, member.IsVerified, member.IsAdmin);

    /// <summary>The member with their church's name, read from the database.</summary>
    internal static async Task<MemberDto> DtoOfAsync(IAppDbContext database, Member member, CancellationToken cancellationToken)
    {
        var churchName = await database.Churches.AsNoTracking()
            .Where(church => church.Id == member.ChurchId)
            .Select(church => church.Name)
            .FirstAsync(cancellationToken);
        return ToDto(member, churchName);
    }
}
