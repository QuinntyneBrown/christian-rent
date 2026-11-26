using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Signs in a person by the sign-in identifier in <c>X-Test-Sign-In</c>, as a principal with only
/// the <c>sub</c> claim, the path real sign-in takes (ADR 0017); membership is then resolved by
/// <c>MemberClaimsTransformation</c>. For the tests of cross-cuts, <c>X-Test-Member</c> signs in
/// a member by identifier without their row, and <c>X-Test-Admin: true</c> makes them an admin
/// (ADR 0005). It exists only in the tests; without a header nobody is signed in.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string MemberHeader = "X-Test-Member";
    public const string AdminHeader = "X-Test-Admin";
    public const string SignInHeader = "X-Test-Sign-In";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Request.Headers.TryGetValue(SignInHeader, out var signInId))
        {
            var person = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", signInId.ToString())], SchemeName));
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(person, SchemeName)));
        }

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
