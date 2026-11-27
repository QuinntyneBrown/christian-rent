using System.Security.Claims;
using ChristianRent.Application.Abstractions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// <see cref="ISessionCookies"/> over ASP.NET Core's cookie authentication (ADR 0029). The
/// principal holds the account's id as <c>sub</c> and its security stamp; nothing personal. A
/// member session is persistent and sliding; an Admin session lasts for the browser session and
/// at most its lifetime from sign-in.
/// </summary>
internal sealed class CookieSessions(IHttpContextAccessor accessor) : ISessionCookies
{
    public Task SignInAsync(SessionKind kind, string accountId, string securityStamp)
    {
        var scheme = SessionSchemes.Of(kind);
        var identity = new ClaimsIdentity(
            [new Claim(HttpCurrentMember.SignInIdClaim, accountId), new Claim(SessionSchemes.SecurityStampClaim, securityStamp)],
            scheme);
        var properties = new AuthenticationProperties { IsPersistent = kind == SessionKind.Member };
        return Context.SignInAsync(scheme, new ClaimsPrincipal(identity), properties);
    }

    public Task SignOutAsync(SessionKind kind) => Context.SignOutAsync(SessionSchemes.Of(kind));

    private HttpContext Context => accessor.HttpContext ?? throw new InvalidOperationException("No request.");
}
