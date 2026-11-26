using System.Net;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>L2-027 criterion 2: a request that changes data from another site is refused.</summary>
public sealed class CrossSiteTests(ProbeApiFactory factory) : IClassFixture<ProbeApiFactory>
{
    [Theory]
    [InlineData("Origin", "https://evil.example")]
    [InlineData("Origin", "http://christian.rent")]
    [InlineData("Sec-Fetch-Site", "cross-site")]
    [InlineData("Sec-Fetch-Site", "same-site")]
    public async Task A_write_from_another_site_is_refused(string header, string value)
    {
        using var client = factory.CreateHttpsClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/test-probe/open");
        request.Headers.Add(header, value);

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("cross_site_request", (await Problem.ReadAsync(response)).Code);
    }

    [Theory]
    [InlineData("Origin", ApiFactory.SiteOrigin)]
    [InlineData("Sec-Fetch-Site", "same-origin")]
    [InlineData("Sec-Fetch-Site", "none")]
    public async Task A_write_from_the_site_itself_is_allowed(string header, string value)
    {
        using var client = factory.CreateHttpsClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/test-probe/open");
        request.Headers.Add(header, value);

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_read_from_another_site_is_not_refused()
    {
        using var client = factory.CreateHttpsClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/test-probe/open");
        request.Headers.Add("Origin", "https://evil.example");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
