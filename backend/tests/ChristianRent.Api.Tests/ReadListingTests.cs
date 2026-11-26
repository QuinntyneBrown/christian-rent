// Acceptance Test
// Traces to: L2-007, L2-008, L2-022, L2-025
// Description: GET /api/listings/{id} answers anyone with an approved listing, its poster and church, and reveals nothing else.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;

namespace ChristianRent.Api.Tests;

public sealed class ReadListingTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-007 criterion 1; L2-008 criteria 1 to 3 and 6; L2-022: anyone reads an approved listing
    // for rent with its photos, price, when, area, note, poster and church, each verified.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task Anyone_reads_an_approved_listing_with_its_photos_poster_and_church()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, joinedIn: 2023);
        var first = Guid.NewGuid();
        var hall = TestData.ForRent(dan, "Sunlit fellowship hall for 80", TestData.At(2), photoId: first);
        await _factory.SeedAsync(TestData.Grace, dan, hall);
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listing = await ReadAsync(response);
        Assert.Equal(hall.Id, listing.GetProperty("id").GetGuid());
        Assert.Equal("for-rent", listing.GetProperty("offer").GetString());
        Assert.Equal("space", listing.GetProperty("kind").GetString());
        Assert.Equal("Sunlit fellowship hall for 80", listing.GetProperty("title").GetString());
        Assert.Equal(45m, listing.GetProperty("price").GetProperty("amount").GetDecimal());
        Assert.Equal("hour", listing.GetProperty("price").GetProperty("period").GetString());
        Assert.Equal("Weekdays and Saturdays", listing.GetProperty("when").GetProperty("text").GetString());
        Assert.Equal("Langley", listing.GetProperty("area").GetString());
        Assert.Equal(JsonValueKind.Null, listing.GetProperty("distanceKm").ValueKind);
        Assert.Equal("Our hall sits empty most of the week.", listing.GetProperty("note").GetString());
        Assert.Equal(hall.CreatedAt, listing.GetProperty("postedAt").GetDateTimeOffset());
        Assert.False(listing.GetProperty("isOwn").GetBoolean());

        var photos = listing.GetProperty("photos").EnumerateArray().ToList();
        Assert.Equal(2, photos.Count);
        Assert.Equal($"/api/photos/{first}/gallery", photos[0].GetProperty("url").GetString());
        Assert.Equal($"/api/photos/{first}/thumb", photos[0].GetProperty("thumbUrl").GetString());
        Assert.Equal(1600, photos[0].GetProperty("width").GetInt32());
        Assert.Equal(1200, photos[0].GetProperty("height").GetInt32());
        Assert.Equal("A bright hall with round tables", photos[0].GetProperty("description").GetString());
        Assert.Equal(JsonValueKind.Null, photos[1].GetProperty("description").ValueKind);

        var poster = listing.GetProperty("poster");
        Assert.Equal("Pastor Dan Whitaker", poster.GetProperty("name").GetString());
        Assert.True(poster.GetProperty("isVerified").GetBoolean());
        Assert.Equal(2023, poster.GetProperty("memberSince").GetInt32());
        Assert.Equal("Grace Community Church", poster.GetProperty("church").GetProperty("name").GetString());
        Assert.True(poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    // L2-008 criterion 5: the response carries no contact detail and no identifier of the member.
    [Fact]
    public async Task The_response_carries_no_contact_detail()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var hall = TestData.ForRent(dan, "Sunlit fellowship hall for 80", TestData.At(2));
        await _factory.SeedAsync(TestData.Grace, dan, hall);
        using var client = _factory.CreateHttpsClient();

        var listing = await ReadAsync(await client.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken));

        Assert.Equal(["name", "isVerified", "memberSince", "church"], listing.GetProperty("poster").EnumerateObject().Select(property => property.Name));
        Assert.Equal(["name", "isVerified"], listing.GetProperty("poster").GetProperty("church").EnumerateObject().Select(property => property.Name));
    }

    // L2-007 criterion 2: a wanted listing carries no photo, its dates and what the member will pay.
    [Fact]
    public async Task A_wanted_listing_carries_its_dates_and_no_photo()
    {
        var marcus = TestData.Member("Marcus Lee", TestData.NewSong, joinedIn: 2024);
        var van = TestData.Wanted(marcus, "15-passenger van for youth camp", TestData.At(5), new Price(120m, PricePeriod.Day));
        await _factory.SeedAsync(TestData.NewSong, marcus, van);
        using var client = _factory.CreateHttpsClient();

        var listing = await ReadAsync(await client.GetAsync($"/api/listings/{van.Id}", TestContext.Current.CancellationToken));

        Assert.Equal("wanted", listing.GetProperty("offer").GetString());
        Assert.Equal("thing", listing.GetProperty("kind").GetString());
        Assert.Equal(120m, listing.GetProperty("price").GetProperty("amount").GetDecimal());
        Assert.Equal("2026-07-14", listing.GetProperty("when").GetProperty("start").GetString());
        Assert.Equal("2026-07-18", listing.GetProperty("when").GetProperty("end").GetString());
        Assert.Empty(listing.GetProperty("photos").EnumerateArray());
    }

    // L2-008 criteria 2 to 4: the member and the church are each marked only when verified. One
    // case per row.
    [Theory]
    [InlineData(true, true)]
    [InlineData(true, false)]
    [InlineData(false, false)]
    public async Task The_member_and_the_church_are_verified_separately(bool memberVerified, bool churchVerified)
    {
        var church = churchVerified ? TestData.Grace : TestData.StPauls;
        var alicia = TestData.Member("Dr. Alicia Gomez", church, isVerified: memberVerified);
        var office = TestData.Wanted(alicia, "Small office for weekly counselling", TestData.At(7));
        await _factory.SeedAsync(church, alicia, office);
        using var client = _factory.CreateHttpsClient();

        var poster = (await ReadAsync(await client.GetAsync($"/api/listings/{office.Id}", TestContext.Current.CancellationToken))).GetProperty("poster");

        Assert.Equal(memberVerified, poster.GetProperty("isVerified").GetBoolean());
        Assert.Equal(churchVerified, poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    // L2-007 criterion 4; L2-025 criterion 2: anything but an approved listing by an active member
    // is not found, with the same answer whatever the reason. One case per row.
    [Theory]
    [InlineData("waiting")]
    [InlineData("removed")]
    [InlineData("member removed")]
    [InlineData("unknown")]
    [InlineData("not an identifier")]
    public async Task Any_other_listing_is_not_found_and_nothing_is_revealed(string situation)
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var listing = TestData.ForRent(dan, "Backyard garden for gatherings", situation == "waiting" ? null : TestData.At(2));
        if (situation == "removed")
        {
            listing.Remove();
        }

        if (situation == "member removed")
        {
            dan.Remove();
        }

        await _factory.SeedAsync(TestData.Grace, dan, listing);
        var id = situation switch
        {
            "unknown" => Guid.NewGuid().ToString(),
            "not an identifier" => "garden",
            _ => listing.Id.ToString(),
        };
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/listings/{id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("not_found", problem.Code);
        Assert.Equal("Not found", problem.Title);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.Body.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal));
        Assert.DoesNotContain("garden", problem.Body.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    // L2-007 criterion 4: the poster and an admin still see a listing that is waiting for review,
    // and the poster's is marked as their own.
    [Theory]
    [InlineData("poster", true)]
    [InlineData("admin", false)]
    public async Task The_poster_and_an_admin_see_a_waiting_listing(string caller, bool isOwn)
    {
        var okafor = TestData.Member("The Okafor family", TestData.Grace);
        var garden = TestData.ForRent(okafor, "Backyard garden for gatherings", approvedAt: null);
        await _factory.SeedAsync(TestData.Grace, okafor, garden);
        using var client = caller == "poster"
            ? _factory.CreateMemberClient(okafor.Id)
            : _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

        using var response = await client.GetAsync($"/api/listings/{garden.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(isOwn, (await ReadAsync(response)).GetProperty("isOwn").GetBoolean());
    }

    // L2-025 criterion 2: another member does not see a listing that is waiting for review.
    [Fact]
    public async Task Another_member_does_not_see_a_waiting_listing()
    {
        var okafor = TestData.Member("The Okafor family", TestData.Grace);
        var garden = TestData.ForRent(okafor, "Backyard garden for gatherings", approvedAt: null);
        await _factory.SeedAsync(TestData.Grace, okafor, garden);
        using var client = _factory.CreateMemberClient(Guid.NewGuid());

        using var response = await client.GetAsync($"/api/listings/{garden.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
}
