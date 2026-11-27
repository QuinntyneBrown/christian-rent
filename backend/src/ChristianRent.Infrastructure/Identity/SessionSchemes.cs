using ChristianRent.Application.Abstractions;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// The authentication schemes of the two sessions (ADR 0029). <see cref="Session"/> is the
/// default: a policy scheme that forwards a request under <see cref="AdminPath"/> to
/// <see cref="Admin"/> and any other to <see cref="Member"/>, so a request is authenticated by its
/// own application's cookie only.
/// </summary>
public static class SessionSchemes
{
    public const string Session = "Session";
    public const string Member = "Member";
    public const string Admin = "Admin";

    /// <summary>Everything Admin calls is under this path.</summary>
    public const string AdminPath = "/api/admin";

    public const string SecurityStampClaim = "AspNet.Identity.SecurityStamp";

    public static string Of(SessionKind kind) => kind == SessionKind.Admin ? Admin : Member;

    /// <summary>The cookie's name; outside development it takes the <c>__Host-</c> prefix.</summary>
    public static string CookieName(string scheme, bool development) =>
        (development ? "" : "__Host-") + (scheme == Admin ? "cr-admin" : "cr-member");

    public static bool IsAdminPath(Microsoft.AspNetCore.Http.PathString path) =>
        path.StartsWithSegments(AdminPath, StringComparison.OrdinalIgnoreCase);
}
