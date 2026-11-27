using System.Net;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>L2-025 criteria 1, 3 and 4: the backend decides; a refusal is a ProblemDetails with a code.</summary>
public sealed class AccessTests(ProbeApiFactory factory) : IClassFixture<ProbeApiFactory>
{
    private static readonly Guid SarahKim = Guid.Parse("5a7a4c3e-0000-4000-8000-000000000001");

    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_protected_endpoint_answers_401_not_signed_in_without_a_member()
    {
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync("/api/test-probe/protected", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("not_signed_in", (await Problem.ReadAsync(response)).Code);
    }

    [Fact]
    public async Task A_protected_endpoint_answers_a_signed_in_member()
    {
        using var client = factory.CreateMemberClient(SarahKim);

        var body = await client.GetStringAsync("/api/test-probe/protected", TestContext.Current.CancellationToken);

        Assert.Equal(SarahKim.ToString(), body);
    }

    [Fact]
    public async Task An_anonymous_endpoint_answers_without_a_member()
    {
        using var client = factory.CreateHttpsClient();

        var body = await client.GetStringAsync("/api/test-probe/open", TestContext.Current.CancellationToken);

        Assert.Equal("anonymous", body);
    }

    // ADR 0029; L2-040 criterion 3: the member session lends nothing to an Admin endpoint.
    [Fact]
    public async Task An_admin_endpoint_answers_401_not_signed_in_to_the_member_session()
    {
        using var client = factory.CreateMemberClient(SarahKim);

        using var response = await client.GetAsync("/api/test-probe/admin", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("not_signed_in", (await Problem.ReadAsync(response)).Code);
    }

    [Fact]
    public async Task An_admin_endpoint_answers_403_not_an_admin_to_a_member_signed_in_to_Admin()
    {
        using var client = factory.CreateMemberClient(SarahKim, session: "admin");

        using var response = await client.GetAsync("/api/test-probe/admin", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("not_an_admin", (await Problem.ReadAsync(response)).Code);
    }

    [Fact]
    public async Task An_admin_endpoint_answers_an_admin()
    {
        using var client = factory.CreateMemberClient(SarahKim, admin: true);

        using var response = await client.GetAsync("/api/test-probe/admin", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // The enforce-access design's table of refusals, one case per row.
    [Theory]
    [InlineData("not-found", HttpStatusCode.NotFound, "not_found")]
    [InlineData("forbidden", HttpStatusCode.Forbidden, "own_listing")]
    [InlineData("conflict", HttpStatusCode.Conflict, "already_reported")]
    [InlineData("limit", HttpStatusCode.TooManyRequests, "post_limit_reached")]
    public async Task A_known_refusal_is_a_ProblemDetails_with_its_code(string kind, HttpStatusCode status, string code)
    {
        using var client = factory.CreateMemberClient(SarahKim);

        using var response = await client.GetAsync($"/api/test-probe/fail/{kind}", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
    }

    [Fact]
    public async Task A_limit_says_when_it_lifts()
    {
        using var client = factory.CreateMemberClient(SarahKim);

        using var response = await client.GetAsync("/api/test-probe/fail/limit", TestContext.Current.CancellationToken);

        var problem = await Problem.ReadAsync(response);
        Assert.Equal("2026-06-08T16:00:00+00:00", problem.Body.GetProperty("retryAt").GetString());
    }
}
