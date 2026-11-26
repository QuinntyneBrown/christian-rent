using System.Net;
using ChristianRent.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ChristianRent.Api.Tests;

/// <summary>L2-027 criterion 1 and L2-026 criterion 3: HTTPS, HSTS and the Content-Security-Policy.</summary>
public sealed class TransportTests(ProbeApiFactory factory) : IClassFixture<ProbeApiFactory>
{
    public const string ContentSecurityPolicy =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; " +
        "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";

    [Fact]
    public async Task A_request_over_HTTP_is_redirected_to_HTTPS()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("http://christian.rent"),
            AllowAutoRedirect = false,
        });

        using var response = await client.GetAsync("/health/live", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.TemporaryRedirect, response.StatusCode);
        Assert.Equal(new Uri("https://christian.rent/health/live"), response.Headers.Location);
    }

    [Fact]
    public async Task A_response_over_HTTPS_carries_HSTS()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://christian.rent"),
            AllowAutoRedirect = false,
        });

        using var response = await client.GetAsync("/health/live", TestContext.Current.CancellationToken);

        Assert.Equal("max-age=31536000; includeSubDomains", Assert.Single(response.Headers.GetValues("Strict-Transport-Security")));
    }

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/api/test-probe/protected")]
    [InlineData("/api/no-such-endpoint")]
    public async Task Every_response_carries_a_CSP_that_allows_no_inline_or_third_party_script(string path)
    {
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal(ContentSecurityPolicy, Assert.Single(response.Headers.GetValues("Content-Security-Policy")));
        Assert.Equal("nosniff", Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));
        Assert.Equal("strict-origin-when-cross-origin", Assert.Single(response.Headers.GetValues("Referrer-Policy")));
    }
}
