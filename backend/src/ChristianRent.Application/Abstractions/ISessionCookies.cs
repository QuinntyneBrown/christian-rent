namespace ChristianRent.Application.Abstractions;

/// <summary>Which application a session belongs to (ADR 0029): `rent`'s members or Admin.</summary>
public enum SessionKind
{
    Member,
    Admin,
}

/// <summary>
/// Issues and clears the session cookie of one application (ADR 0029). The cookie holds the
/// account's id and security stamp, and nothing else.
/// </summary>
public interface ISessionCookies
{
    Task SignInAsync(SessionKind kind, string accountId, string securityStamp);

    /// <summary>Clears that application's cookie only; the other's is untouched (L2-039, criterion 3).</summary>
    Task SignOutAsync(SessionKind kind);
}
