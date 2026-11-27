using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// Checks a session cookie on every request (ADR 0029): its account must still exist with the
/// same security stamp, and must not be a removed member's (L2-018, criterion 4; L2-040, criteria
/// 4 and 5). Otherwise the cookie is rejected and cleared. The cookie never redirects: a
/// challenge or a forbid is left to the authorisation result handler's ProblemDetails.
/// </summary>
public sealed class SessionCookieEvents(AppDbContext database) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var accountId = context.Principal?.FindFirst(HttpCurrentMember.SignInIdClaim)?.Value;
        var stamp = context.Principal?.FindFirst(SessionSchemes.SecurityStampClaim)?.Value;
        var valid = accountId is not null
            && await database.Users.AsNoTracking().AnyAsync(account => account.Id == accountId && account.SecurityStamp == stamp)
            && !await database.Members.AsNoTracking().AnyAsync(member => member.SignInId == accountId && member.Status == MemberStatus.Removed);
        if (!valid)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(context.Scheme.Name);
        }
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
