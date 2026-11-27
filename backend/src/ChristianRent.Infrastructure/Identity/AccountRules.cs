using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// ASP.NET Core Identity for accounts (ADR 0029): the email is the user name and is unique; a
/// password has at least 12 characters and no composition rules (NIST SP 800-63B); Identity's own
/// lockout is off, because <c>SignInLockout</c> replaces it.
/// </summary>
public static class AccountRules
{
    public const int MinPasswordLength = 12;

    public static IServiceCollection AddAccounts(this IServiceCollection services)
    {
        services.AddIdentityCore<Account>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = MinPasswordLength;
                options.Password.RequiredUniqueChars = 1;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.AllowedForNewUsers = false;
                options.Lockout.MaxFailedAccessAttempts = int.MaxValue;
            })
            .AddEntityFrameworkStores<AppDbContext>();
        services.AddScoped<Application.Abstractions.IAccounts, IdentityAccounts>();
        return services;
    }
}
