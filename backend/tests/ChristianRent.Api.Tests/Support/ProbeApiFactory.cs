using ChristianRent.Api.Tests.Probe;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ChristianRent.Api.Tests.Support;

/// <summary>The API with the test-only probe endpoints, test sign-in and captured logs.</summary>
public class ProbeApiFactory : ApiFactory
{
    public CapturedLogs Logs { get; } = new();

    public HttpClient CreateMemberClient(Guid memberId, bool admin = false)
    {
        var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.MemberHeader, memberId.ToString());
        if (admin)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.AdminHeader, "true");
        }

        return client;
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddControllers().AddApplicationPart(typeof(ProbeController).Assembly);
        services.AddMediatR(configuration => configuration.RegisterServicesFromAssemblyContaining<ProbeController>());
        services.AddValidatorsFromAssemblyContaining<ProbeController>();
        services.AddAuthentication(TestAuthHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        services.AddLogging(logging => logging.AddProvider(Logs));
    }
}
