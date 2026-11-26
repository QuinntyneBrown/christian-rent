using System.Net;
using System.Net.Http.Json;
using System.Text;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>L2-026 criterion 2: every input is validated before it is used.</summary>
public sealed class ValidationTests(ProbeApiFactory factory) : IClassFixture<ProbeApiFactory>
{
    private static readonly Guid SarahKim = Guid.Parse("5a7a4c3e-0000-4000-8000-000000000001");

    [Theory]
    [InlineData("")]
    [InlineData("far too long a name")]
    public async Task A_field_that_breaks_a_rule_is_refused_naming_the_field(string name)
    {
        using var client = factory.CreateMemberClient(SarahKim);

        using var response = await client.PostAsJsonAsync("/api/test-probe/echo", new { name }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.True(problem.Body.GetProperty("errors").TryGetProperty("name", out _));
    }

    [Fact]
    public async Task A_body_that_is_not_the_right_type_is_refused()
    {
        using var client = factory.CreateMemberClient(SarahKim);
        using var content = new StringContent("{\"name\": [1, 2]}", Encoding.UTF8, "application/json");

        using var response = await client.PostAsync("/api/test-probe/echo", content, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("validation_failed", (await Problem.ReadAsync(response)).Code);
    }

    [Fact]
    public async Task A_valid_request_reaches_its_handler()
    {
        using var client = factory.CreateMemberClient(SarahKim);

        using var response = await client.PostAsJsonAsync("/api/test-probe/echo", new { name = "Sarah" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Sarah", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
