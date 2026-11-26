// Acceptance Test
// Traces to: L2-017, L2-026
// Description: Joining is refused with validation_failed, naming each field and why, unless the name, the church and the declaration are all given within their limits.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class JoinValidationTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-017 criteria 1 and 10: without a name, a church and the declaration nobody joins, and
    // each missing one is named with its reason.
    [Fact]
    public async Task Joining_with_nothing_is_refused_naming_the_name_the_church_and_the_declaration()
    {
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync("/api/members", new { name = "  " }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        var errors = problem.Body.GetProperty("errors");
        Assert.Equal("Enter your name, up to 60 characters.", errors.GetProperty("name")[0].GetString());
        Assert.Equal("Choose your church, or choose “My church isn’t listed”.", errors.GetProperty("churchId")[0].GetString());
        Assert.Equal("Tick the box to declare that you are a Christian.", errors.GetProperty("declaresChristian")[0].GetString());
        Assert.Empty(await MembersAsync());
    }

    // L2-017 criterion 6, through the API: a name over 60 characters is refused with its reason.
    [Fact]
    public async Task A_name_over_60_characters_is_refused()
    {
        await _factory.SeedAsync(TestData.Grace);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            "/api/members",
            new { name = new string('a', 61), churchId = TestData.Grace.Id, declaresChristian = true },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("Enter your name, up to 60 characters.", problem.Body.GetProperty("errors").GetProperty("name")[0].GetString());
    }

    // become-member design: a church that does not exist is refused like a missing one.
    [Fact]
    public async Task An_unknown_church_is_refused_on_the_church_field()
    {
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            "/api/members",
            new { name = "Sarah Kim", churchId = Guid.NewGuid(), declaresChristian = true },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.True(problem.Body.GetProperty("errors").TryGetProperty("churchId", out _));
        Assert.Empty(await MembersAsync());
    }

    // The rules of JoinCommandValidator (L2-017 criteria 1, 2 and 6; ADR 0018), one case per row.
    [Theory]
    [InlineData("Sarah Kim", "grace", null, null, true, null)]
    [InlineData("", "grace", null, null, true, "Name")]
    [InlineData("   ", "grace", null, null, true, "Name")]
    [InlineData("60", "grace", null, null, true, null)]
    [InlineData("61", "grace", null, null, true, "Name")]
    [InlineData("Sarah Kim", null, null, null, true, "ChurchId")]
    [InlineData("Sarah Kim", "grace", "Grace", "Langley", true, "ChurchId")]
    [InlineData("Sarah Kim", null, "Fort Langley Evangelical Free", "Fort Langley", true, null)]
    [InlineData("Sarah Kim", null, "100", "Fort Langley", true, null)]
    [InlineData("Sarah Kim", null, "101", "Fort Langley", true, "NewChurchName")]
    [InlineData("Sarah Kim", null, "Fort Langley Evangelical Free", "", true, "NewChurchCity")]
    [InlineData("Sarah Kim", null, "Fort Langley Evangelical Free", "80", true, null)]
    [InlineData("Sarah Kim", null, "Fort Langley Evangelical Free", "81", true, "NewChurchCity")]
    [InlineData("Sarah Kim", "grace", null, null, false, "DeclaresChristian")]
    public void JoinCommandValidator_names_the_one_invalid_field(string name, string? church, string? newName, string? newCity, bool declares, string? invalid)
    {
        var command = new JoinCommand(
            Text(name),
            church is null ? null : TestData.Grace.Id,
            newName is null ? null : Text(newName),
            newCity is null ? null : Text(newCity),
            declares);

        var result = new JoinCommandValidator().Validate(command);

        Assert.Equal(invalid is null ? [] : [invalid], result.Errors.Select(error => error.PropertyName).Distinct());
    }

    // A number stands for text of that many characters, spaces around it excepted.
    private static string Text(string value) =>
        int.TryParse(value, out var length) ? $"  {new string('é', length)} " : value;

    private async Task<List<Domain.Members.Member>> MembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.ToListAsync(TestContext.Current.CancellationToken);
    }
}
