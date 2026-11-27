using ChristianRent.Infrastructure.Identity;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;

namespace ChristianRent.Api.Access;

internal static class AccessExtensions
{
    public const string AdminPolicy = "Admin";
    public const string AdminSessionPolicy = "AdminSession";

    /// <summary>
    /// One cookie session per application, chosen by path (ADR 0029): a request under
    /// <c>/api/admin/</c> is authenticated by the Admin cookie only, any other by the member cookie
    /// only. Every endpoint requires a signed-in member unless it says <c>[AllowAnonymous]</c>
    /// (L2-025, criterion 1); <c>AdminSession</c> requires someone signed in to Admin, and
    /// <c>Admin</c> an admin. Each policy names its scheme, so neither session lends rights to the
    /// other.
    /// </summary>
    public static IServiceCollection AddAccess(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var lifetimes = configuration.GetSection(SessionOptions.Section).Get<SessionOptions>() ?? new SessionOptions();

        services.AddAuthentication(SessionSchemes.Session)
            .AddPolicyScheme(SessionSchemes.Session, "The session of the path's application", options =>
                options.ForwardDefaultSelector = context =>
                    SessionSchemes.IsAdminPath(context.Request.Path) ? SessionSchemes.Admin : SessionSchemes.Member)
            .AddCookie(SessionSchemes.Member, options => Configure(options, SessionSchemes.Member, environment, lifetimes.MemberLifetime, sliding: true))
            .AddCookie(SessionSchemes.Admin, options => Configure(options, SessionSchemes.Admin, environment, lifetimes.AdminLifetime, sliding: false));

        // The keys that protect the cookies live in the database, so a restart or a second
        // instance still reads them (L2-040, criterion 7).
        services.AddDataProtection()
            .SetApplicationName("christian-rent")
            .PersistKeysToDbContext<AppDbContext>();

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder(SessionSchemes.Member).RequireAuthenticatedUser().Build())
            .AddPolicy(AdminSessionPolicy, policy => policy.AddAuthenticationSchemes(SessionSchemes.Admin).RequireAuthenticatedUser())
            .AddPolicy(AdminPolicy, policy => policy.AddAuthenticationSchemes(SessionSchemes.Admin).RequireAuthenticatedUser().RequireRole(HttpCurrentMember.AdminRole));

        services.AddSingleton<IAuthorizationMiddlewareResultHandler, ProblemAuthorizationResultHandler>();
        return services;
    }

    private static void Configure(CookieAuthenticationOptions options, string scheme, IHostEnvironment environment, TimeSpan lifetime, bool sliding)
    {
        var development = environment.IsDevelopment();
        options.Cookie.Name = SessionSchemes.CookieName(scheme, development);
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.Path = "/";
        options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = lifetime;
        options.SlidingExpiration = sliding;
        options.EventsType = typeof(SessionCookieEvents);
    }
}
