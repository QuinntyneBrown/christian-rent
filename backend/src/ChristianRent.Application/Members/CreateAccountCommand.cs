using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// The operator creates an account, and may link it to an active member, so that person can
/// sign in (ADR 0029). Running it again changes nothing: an account that exists keeps its
/// password. Only <c>ChristianRent.Cli create-account</c> sends it; nobody can create their own
/// account yet.
/// </summary>
public sealed record CreateAccountCommand(string Email, string Password, Guid? MemberId) : IRequest<CreateAccountResult>;

/// <summary>What came of it: <see cref="Problems"/> is empty when the account exists or was made.</summary>
public sealed record CreateAccountResult(bool Created, bool Linked, IReadOnlyList<string> Problems)
{
    public bool Refused => Problems.Count > 0;

    public static CreateAccountResult Refuse(params string[] problems) => new(false, false, problems);
}

internal sealed class CreateAccountCommandHandler(IAppDbContext database, IAccounts accounts)
    : IRequestHandler<CreateAccountCommand, CreateAccountResult>
{
    public async Task<CreateAccountResult> Handle(CreateAccountCommand command, CancellationToken cancellationToken)
    {
        if (command.Password.Length == 0)
        {
            return CreateAccountResult.Refuse("Enter the password on standard input.");
        }

        Member? member = null;
        if (command.MemberId is { } memberId)
        {
            member = await database.Members.FirstOrDefaultAsync(
                member => member.Id == memberId && member.Status == MemberStatus.Active, cancellationToken);
            if (member is null)
            {
                return CreateAccountResult.Refuse("No active member has that identifier.");
            }
        }

        var existing = await accounts.FindByEmailAsync(command.Email, cancellationToken);
        if (member?.SignInId is { } linkedTo && linkedTo != existing?.Id)
        {
            return CreateAccountResult.Refuse("That member is linked to another account.");
        }

        var created = false;
        var accountId = existing?.Id;
        if (accountId is null)
        {
            var creation = await accounts.CreateAsync(command.Email, command.Password, cancellationToken);
            if (creation.AccountId is null)
            {
                return CreateAccountResult.Refuse([.. creation.Problems]);
            }

            accountId = creation.AccountId;
            created = true;
        }

        var linked = false;
        if (member is not null && member.SignInId != accountId)
        {
            member.LinkSignIn(accountId);
            await database.SaveChangesAsync(cancellationToken);
            linked = true;
        }

        return new CreateAccountResult(created, linked, []);
    }
}
