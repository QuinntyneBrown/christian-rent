using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Signs in the member named in <c>X-Test-Member</c>, an admin with <c>X-Test-Admin: true</c>
/// (ADR 0005). It exists only in the tests; without the header nobody is signed in.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string MemberHeader = "X-Test-Member";
    public const string AdminHeader = "X-Test-Admin";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(MemberHeader, out var memberId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim> { new("member_id", memberId.ToString()) };
        if (Request.Headers.TryGetValue(AdminHeader, out var admin) && admin == "true")
        {
            claims.Add(new Claim(ClaimTypes.Role, "admin"));
        }

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
