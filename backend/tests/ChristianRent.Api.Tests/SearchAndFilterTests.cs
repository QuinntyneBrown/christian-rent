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

    // L2-003 criteria 1 and 2: words in the title, the note or the area, whatever their case.
    [Theory]
    [InlineData("parking", new[] { "Parking space near church" })]
    [InlineData("GYMNASIUM", new[] { "Fellowship hall" })]
    [InlineData("abbotsford", new[] { "Folding chairs" })]
    [InlineData("chair", new[] { "Folding chairs" })]
    [InlineData("  Parking   CHURCH ", new[] { "Parking space near church" })]
    [InlineData("parking chairs", new string[0])]
    [InlineData("hot air balloon", new string[0])]
    public async Task A_search_finds_every_word_in_the_title_note_or_area(string term, string[] titles)
    {
        await SeedCastAsync();
        using var client = _factory.CreateHttpsClient();

        var page = await GetAsync(client, $"/api/listings?q={Uri.EscapeDataString(term)}");

        Assert.Equal(titles, Titles(page));
    }

    // L2-003: without regard to accents, on either side.
    [Theory]
    [InlineData("eglise")]
    [InlineData("ÉGLISE")]
    [InlineData("Église")]
    public async Task A_search_finds_words_without_regard_to_accents(string term)
    {
        await _factory.SeedAsync(
            TestData.Grace,
            _dan,
            TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Salle de l’église", TestData.At(2)),
            TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Café tables", TestData.At(3)));
        using var client = _factory.CreateHttpsClient();

        Assert.Equal(["Salle de l’église"], Titles(await GetAsync(client, $"/api/listings?q={Uri.EscapeDataString(term)}")));
        Assert.Equal(["Café tables"], Titles(await GetAsync(client, "/api/listings?q=cafe")));
    }

    // L2-002 criteria 4 and 6: the term and the switch apply together, and the counts are those
    // of the term.
    [Fact]
    public async Task The_term_and_the_switch_apply_together_and_the_counts_follow_the_term()
    {
        await SeedCastAsync();
        using var client = _factory.CreateHttpsClient();

        var forRent = await GetAsync(client, "/api/listings?show=for-rent&q=church");
        var wanted = await GetAsync(client, "/api/listings?show=wanted&q=church");

        Assert.Equal(["Parking space near church"], Titles(forRent));
        Assert.Empty(Titles(wanted));
        AssertCounts(forRent, everything: 1, forRent: 1, wanted: 0);
        AssertCounts(wanted, everything: 1, forRent: 1, wanted: 0);
    }

    // L2-003 criterion 4: only the first 100 characters of a term are used.
    [Fact]
    public async Task Only_the_first_100_characters_of_a_term_are_used()
    {
        await SeedCastAsync();
        using var client = _factory.CreateHttpsClient();
        var term = "parking".PadRight(100) + "nothing-matches-this";

        var page = await GetAsync(client, $"/api/listings?q={Uri.EscapeDataString(term)}");

        Assert.Equal(["Parking space near church"], Titles(page));
    }

    // L2-026 criterion 2: the term is data; characters a database would read as a pattern or as
    // SQL match only themselves.
    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    [InlineData("' OR 1=1 --")]
    [InlineData("<script>alert(1)</script>")]
    public async Task A_term_is_matched_as_text_and_never_as_a_pattern_or_sql(string term)
    {
        await SeedCastAsync();
        using var client = _factory.CreateHttpsClient();

        var page = await GetAsync(client, $"/api/listings?q={Uri.EscapeDataString(term)}");

        Assert.Empty(Titles(page));
        AssertCounts(page, everything: 0, forRent: 0, wanted: 0);
    }

    // L2-006 with L2-003: a further page keeps the term.
    [Fact]
    public async Task A_further_page_keeps_the_term()
    {
        var hall = TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Hall one", TestData.At(5));
        var other = TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Guest room", TestData.At(4));
        var older = TestData.Approved(_dan, ListingOffer.ForRent, ListingKind.Space, "Hall two", TestData.At(3));
        await _factory.SeedAsync(TestData.Grace, _dan, hall, other, older);
        using var client = _factory.CreateHttpsClient();

        var first = await GetAsync(client, "/api/listings?q=hall&size=1");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await GetAsync(client, $"/api/listings?q=hall&size=1&cursor={Uri.EscapeDataString(cursor)}");

        Assert.Equal(["Hall one"], Titles(first));
        Assert.Equal(["Hall two"], Titles(second));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
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
