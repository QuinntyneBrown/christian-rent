using ChristianRent.Application.Abstractions;
using Microsoft.AspNetCore.Identity;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// <see cref="IAccounts"/> over ASP.NET Core Identity's <see cref="UserManager{TUser}"/> (ADR 0029).
/// Identity's own lockout is off, because it reads the system clock: the handlers apply
/// <c>SignInLockout</c>, which reads <see cref="TimeProvider"/>, and store its outcome in Identity's
/// columns. Refusals are put in words that name nobody: never the email, never the password.
/// </summary>
internal sealed class IdentityAccounts(UserManager<Account> users, IPasswordHasher<Account> hasher) : IAccounts
{
    /// <summary>A hash of no one's password, checked when an email has no account.</summary>
    private static readonly Lazy<string> NobodysHash = new(() =>
        new PasswordHasher<Account>().HashPassword(new Account(), Guid.NewGuid().ToString()));

    public async Task<AccountState?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var account = await users.FindByEmailAsync(email);
        return account is null ? null : StateOf(account);
    }

    public async Task<bool> CheckPasswordAsync(string accountId, string password, CancellationToken cancellationToken)
    {
        var account = await users.FindByIdAsync(accountId);
        return account is not null && await users.CheckPasswordAsync(account, password);
    }

    public void CheckNothing(string password) =>
        hasher.VerifyHashedPassword(new Account(), NobodysHash.Value, password);

    public async Task RecordFailureAsync(string accountId, int failures, DateTimeOffset? lockedUntil, CancellationToken cancellationToken)
    {
        if (await users.FindByIdAsync(accountId) is { } account)
        {
            account.AccessFailedCount = failures;
            account.LockoutEnd = lockedUntil;
            await users.UpdateAsync(account);
        }
    }

    public async Task RecordSuccessAsync(string accountId, CancellationToken cancellationToken)
    {
        if (await users.FindByIdAsync(accountId) is { } account && (account.AccessFailedCount != 0 || account.LockoutEnd is not null))
        {
            account.AccessFailedCount = 0;
            account.LockoutEnd = null;
            await users.UpdateAsync(account);
        }
    }

    public async Task<AccountCreation> CreateAsync(string email, string password, CancellationToken cancellationToken)
    {
        var account = new Account { UserName = email, Email = email };
        var result = await users.CreateAsync(account, password);
        return result.Succeeded
            ? new AccountCreation(account.Id, [])
            : new AccountCreation(null, [.. result.Errors.Select(error => ProblemOf(error.Code)).Distinct()]);
    }

    public async Task EndSessionsAsync(string accountId, CancellationToken cancellationToken)
    {
        if (await users.FindByIdAsync(accountId) is { } account)
        {
            await users.UpdateSecurityStampAsync(account);
        }
    }

    private static AccountState StateOf(Account account) =>
        new(account.Id, account.SecurityStamp ?? "", account.AccessFailedCount, account.LockoutEnd);

    // Identity's own descriptions name the email; these do not (L2-028, criterion 3).
    private static string ProblemOf(string code) => code switch
    {
        nameof(IdentityErrorDescriber.PasswordTooShort) => $"The password must be at least {AccountRules.MinPasswordLength} characters.",
        nameof(IdentityErrorDescriber.InvalidEmail) or nameof(IdentityErrorDescriber.InvalidUserName) => "That is not an email address.",
        nameof(IdentityErrorDescriber.DuplicateEmail) or nameof(IdentityErrorDescriber.DuplicateUserName) => "An account with that email exists.",
        _ => $"The account could not be created ({code}).",
    };
}
