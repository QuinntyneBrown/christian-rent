using ChristianRent.Api.Tests.Probe;
using ChristianRent.Infrastructure.Identity;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ChristianRent.Api.Tests.Support;

/// <summary>The API with the test-only probe endpoints, test sign-in and captured logs.</summary>
public class ProbeApiFactory : ApiFactory
{
    public CapturedLogs Logs { get; } = new();

    /// <summary>Whether <c>TestAuthHandler</c> stands in for the cookies; false keeps the real sign-in.</summary>
    protected virtual bool TestSignIn => true;

    /// <summary>
    /// A member by identifier, holding the member session, or the Admin session with
    /// <paramref name="session"/> <c>admin</c> (ADR 0029).
    /// </summary>
    public HttpClient CreateMemberClient(Guid memberId, bool admin = false, string? session = null)
    {
        var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.MemberHeader, memberId.ToString());
        if (session is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.SessionHeader, session);
        }

        if (admin)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.AdminHeader, "true");
        }

        return client;
    }

    /// <summary>A person signed in by <paramref name="signInId"/>, member or not (ADR 0017).</summary>
    public HttpClient CreateSignedInClient(string signInId, string? session = null)
    {
        var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.SignInHeader, signInId);
        if (session is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.SessionHeader, session);
        }

        return client;
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddControllers().AddApplicationPart(typeof(ProbeController).Assembly);
        services.AddMediatR(configuration => configuration.RegisterServicesFromAssemblyContaining<ProbeController>());
        services.AddValidatorsFromAssemblyContaining<ProbeController>();
        // TestAuthHandler stands in for both cookie schemes, which the path still chooses (ADR 0029).
        services.Configure<AuthenticationOptions>(options =>
        {
            if (!TestSignIn)
            {
                return;
            }

            options.SchemeMap[SessionSchemes.Member].HandlerType = typeof(TestAuthHandler);
            options.SchemeMap[SessionSchemes.Admin].HandlerType = typeof(TestAuthHandler);
        });
        services.AddLogging(logging => logging.AddProvider(Logs));
    }
}
