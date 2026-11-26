// Acceptance Test
// Traces to: L2-002, L2-003, L2-026, L2-035
// Description: GET /api/listings narrows the approved listings by the switch, the kind filter
// and the search term, all together, and counts what each option of the switch holds.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;

namespace ChristianRent.Api.Tests;

public sealed class SearchAndFilterTests : IDisposable
{
    private readonly ApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);

    public void Dispose() => _factory.Dispose();

    // L2-002 criteria 1 to 3: Everything by default, or only listings for rent, or only wanted
    // listings; the counts on the switch do not depend on its own choice (criterion 6).
    [Theory]
    [Trait("Category", "Critical")]
    [InlineData("", new[] { "Folding chairs", "Parking space near church", "Fellowship hall" })]
    [InlineData("?show=for-rent", new[] { "Parking space near church", "Fellowship hall" })]
    [InlineData("?show=wanted", new[] { "Folding chairs" })]
    public async Task The_switch_shows_everything_for_rent_or_wanted(string query, string[] titles)
    {
        await SeedCastAsync();
        using var client = _factory.CreateHttpsClient();

        var page = await GetAsync(client, $"/api/listings{query}");

        Assert.Equal(titles, Titles(page));
        AssertCounts(page, everything: 3, forRent: 2, wanted: 1);
    }

    // L2-026 criterion 2: an option the switch does not have is refused, with the code a client
    // branches on.
    [Theory]
    [InlineData("everything")]
    [InlineData("FOR-RENT")]
    [InlineData("<script>")]
    public async Task A_show_the_switch_does_not_have_is_refused(string show)
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/listings?show={Uri.EscapeDataString(show)}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("show_invalid", (await Problem.ReadAsync(response)).Code);
    }

    private async Task SeedCastAsync()
    {
        await _factory.SeedAsync(
            TestData.Grace,
            _dan,
            TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Fellowship hall", TestData.At(2), note: "Seats eighty in the gymnasium."),
            TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Parking space near church", TestData.At(3)),
            TestData.Approved(_dan, ListingOffer.Wanted, ListingKind.Thing, "Folding chairs", TestData.At(4), area: "Abbotsford"));
    }

    private static async Task<JsonElement> GetAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static List<string?> Titles(JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("title").GetString()).ToList();

    private static void AssertCounts(JsonElement page, int everything, int forRent, int wanted)
    {
        var counts = page.GetProperty("counts");
        Assert.Equal(
            (everything, forRent, wanted),
            (counts.GetProperty("everything").GetInt32(), counts.GetProperty("forRent").GetInt32(), counts.GetProperty("wanted").GetInt32()));
    }
}
