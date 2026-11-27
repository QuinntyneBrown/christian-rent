namespace ChristianRent.Application.Abstractions;

/// <summary>
/// The accounts people sign in with (ADR 0029): an email address, a password hash, a security
/// stamp and the count of refusals with the lockout. Handlers use it; ASP.NET Core Identity
/// implements it in <c>ChristianRent.Infrastructure</c>. Nothing here returns a password or a hash.
/// </summary>
public interface IAccounts
{
    /// <summary>The account with this email, or null.</summary>
    Task<AccountState?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    /// <summary>Whether the password is the account's.</summary>
    Task<bool> CheckPasswordAsync(string accountId, string password, CancellationToken cancellationToken);

    /// <summary>Checks the password against a fixed hash, so an email with no account takes as long.</summary>
    void CheckNothing(string password);

    /// <summary>Records a refusal: the count of refusals in a row and the lockout, if any.</summary>
    Task RecordFailureAsync(string accountId, int failures, DateTimeOffset? lockedUntil, CancellationToken cancellationToken);

    /// <summary>Records a sign-in: the count goes back to zero and any lockout ends.</summary>
    Task RecordSuccessAsync(string accountId, CancellationToken cancellationToken);

    /// <summary>Creates an account, or says why it cannot be created.</summary>
    Task<AccountCreation> CreateAsync(string email, string password, CancellationToken cancellationToken);

    /// <summary>Renews the security stamp, so every session of the account ends at its next request.</summary>
    Task EndSessionsAsync(string accountId, CancellationToken cancellationToken);
}

/// <summary>What sign-in needs to know of an account.</summary>
public sealed record AccountState(string Id, string SecurityStamp, int Failures, DateTimeOffset? LockedUntil);

/// <summary>The account created, or the reasons it was not, in words that name nobody.</summary>
public sealed record AccountCreation(string? AccountId, IReadOnlyList<string> Problems);
