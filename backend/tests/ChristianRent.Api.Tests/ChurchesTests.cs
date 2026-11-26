// Acceptance Test
// Traces to: L2-017, L2-025
// Description: GET /api/churches lists every church by name with its city, to a signed-in person who need not be a member.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

public sealed class ChurchesTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-017 criterion 8; L2-025 criterion 5: a signed-in person who is not a member picks from
    // the existing churches, each with its city, ordered by name.
    [Fact]
    public async Task A_signed_in_person_who_is_not_a_member_lists_the_churches_by_name()
    {
        await _factory.SeedAsync(TestData.StPauls, TestData.Grace, TestData.NewSong);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.GetAsync("/api/churches", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var churches = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["Grace Community Church, Langley", "New Song Fellowship, Langley", "St. Paul’s Anglican, Fort Langley"],
            churches.EnumerateArray().Select(church => $"{church.GetProperty("name").GetString()}, {church.GetProperty("city").GetString()}"));
        Assert.Equal(TestData.Grace.Id, churches[0].GetProperty("id").GetGuid());
    }

    // L2-025 criterion 1 (ADR 0017): the list is not open to someone who is not signed in.
    [Fact]
    public async Task Someone_who_is_not_signed_in_is_refused_401()
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/api/churches", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("not_signed_in", (await Problem.ReadAsync(response)).Code);
    }
}
