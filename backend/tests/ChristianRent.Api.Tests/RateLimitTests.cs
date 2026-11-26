using System.Net;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-027 criterion 3: more than 120 reads or 30 writes from one client in a minute are refused
/// with 429 and Retry-After. Time moves on the fake clock; nothing sleeps.
/// </summary>
public sealed class RateLimitTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // The limits, one case per row.
    [Theory]
    [Trait("Category", "Critical")]
    [InlineData("GET", 120)]
    [InlineData("POST", 30)]
    public async Task The_request_after_the_limit_is_refused_with_429_and_Retry_After(string method, int limit)
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());

        for (var i = 0; i < limit; i++)
        {
            using var allowed = await SendAsync(client, method);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        _factory.Clock.Advance(TimeSpan.FromSeconds(20));
        using var refused = await SendAsync(client, method);

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal(TimeSpan.FromSeconds(40), refused.Headers.RetryAfter?.Delta);
        Assert.Equal("rate_limited", (await Problem.ReadAsync(refused)).Code);
    }

    [Fact]
    public async Task The_limit_lifts_when_the_minute_is_over()
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());
        for (var i = 0; i < 30; i++)
        {
            using var allowed = await SendAsync(client, "POST");
        }

        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        using var response = await SendAsync(client, "POST");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reads_and_writes_are_counted_apart()
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());
        for (var i = 0; i < 30; i++)
        {
            using var allowed = await SendAsync(client, "POST");
        }

        using var read = await SendAsync(client, "GET");

        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
    }

    [Fact]
    public async Task Each_member_has_their_own_limit()
    {
        using var first = _factory.CreateMemberClient(Guid.NewGuid());
        using var second = _factory.CreateMemberClient(Guid.NewGuid());
        for (var i = 0; i < 30; i++)
        {
            using var allowed = await SendAsync(first, "POST");
        }

        using var response = await SendAsync(second, "POST");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task An_anonymous_caller_is_limited_too()
    {
        using var client = _factory.CreateHttpsClient();
        for (var i = 0; i < 30; i++)
        {
            using var allowed = await SendAsync(client, "POST");
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        using var refused = await SendAsync(client, "POST");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
    }

    [Fact]
    public async Task The_health_endpoints_are_never_limited()
    {
        using var client = _factory.CreateHttpsClient();

        for (var i = 0; i < 200; i++)
        {
            using var response = await client.GetAsync("/health/live", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string method) =>
        client.SendAsync(new HttpRequestMessage(new HttpMethod(method), "/api/test-probe/open"), TestContext.Current.CancellationToken);
}
