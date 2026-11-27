using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Members;
using ChristianRent.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Sessions;

/// <summary>
/// A person signs in to one application with their account's email and password (L2-037,
/// L2-038; ADR 0029). The answer is who they are as a member, or null for an account that is
/// not one; every refusal is <see cref="SignInRefusedException"/>.
/// </summary>
public sealed record SignInCommand(SessionKind Kind, string Email, string Password) : IRequest<MemberDto?>;

internal sealed class SignInCommandHandler(
    IAppDbContext database,
    IAccounts accounts,
    ISessionCookies cookies,
    TimeProvider clock) : IRequestHandler<SignInCommand, MemberDto?>
{
    public async Task<MemberDto?> Handle(SignInCommand command, CancellationToken cancellationToken)
    {
        var account = await accounts.FindByEmailAsync(command.Email, cancellationToken);
        if (account is null)
        {
            // As long as checking a password, so an unknown email is not told apart.
            accounts.CheckNothing(command.Password);
            throw new SignInRefusedException();
        }

        var now = clock.GetUtcNow();
        if (SignInLockout.IsLocked(account.LockedUntil, now))
        {
            throw new SignInRefusedException();
        }

        if (!await accounts.CheckPasswordAsync(account.Id, command.Password, cancellationToken))
        {
            var (failures, lockedUntil) = SignInLockout.AfterFailure(account.Failures, now);
            await accounts.RecordFailureAsync(account.Id, failures, lockedUntil, cancellationToken);
            throw new SignInRefusedException();
        }

        // A removed member can no longer sign in (L2-018, criterion 4).
        var member = await database.Members.AsNoTracking()
            .Where(member => member.SignInId == account.Id && member.Status != MemberStatus.Departed)
            .FirstOrDefaultAsync(cancellationToken);
        if (member?.Status == MemberStatus.Removed)
        {
            throw new SignInRefusedException();
        }

        await accounts.RecordSuccessAsync(account.Id, cancellationToken);
        await cookies.SignInAsync(command.Kind, account.Id, account.SecurityStamp);
        return member is null ? null : await JoinCommandHandler.DtoOfAsync(database, member, cancellationToken);
    }
}
