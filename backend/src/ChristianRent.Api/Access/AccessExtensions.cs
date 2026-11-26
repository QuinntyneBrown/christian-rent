using ChristianRent.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;

namespace ChristianRent.Api.Access;

internal static class AccessExtensions
{
    public const string AdminPolicy = "Admin";

    /// <summary>
    /// Every endpoint requires a signed-in member unless it says <c>[AllowAnonymous]</c>
    /// (L2-025, criterion 1); Admin requires an admin.
    /// </summary>
    public static IServiceCollection AddAccess(this IServiceCollection services)
    {
        services.AddAuthentication(NoSignInAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, NoSignInAuthenticationHandler>(NoSignInAuthenticationHandler.SchemeName, _ => { });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(AdminPolicy, policy => policy.RequireAuthenticatedUser().RequireRole(HttpCurrentMember.AdminRole));

        services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationMiddlewareResultHandler, ProblemAuthorizationResultHandler>();
        return services;
    }
}
