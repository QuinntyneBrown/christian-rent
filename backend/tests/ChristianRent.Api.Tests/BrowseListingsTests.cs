// Acceptance Test
// Traces to: L2-001, L2-022, L2-030
// Description: GET /api/listings answers anyone with approved listings, newest first, as cards.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;

namespace ChristianRent.Api.Tests;

public sealed class BrowseListingsTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-001 criteria 1 and 2: approved listings, newest first, without signing in; a listing
    // waiting in the review queue, a removed one and a removed member's are not shown.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task Anyone_sees_approved_listings_newest_first_and_nothing_else()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var removedMember = TestData.Member("Mike Rentals", TestData.Grace);
        removedMember.Remove();
        var hall = TestData.ForRent(dan, "Sunlit fellowship hall for 80", TestData.At(2));
        var van = TestData.Wanted(dan, "15-passenger van for youth camp", TestData.At(5));
        var room = TestData.ForRent(dan, "Quiet guest room, month to month", TestData.At(7));
        var waiting = TestData.ForRent(dan, "Backyard garden for gatherings", approvedAt: null);
        var removed = TestData.ForRent(dan, "Party bus, cheap", TestData.At(6));
        removed.Remove();
        var byRemovedMember = TestData.ForRent(removedMember, "Storage locker", TestData.At(8));
        await _factory.SeedAsync(TestData.Grace, dan, removedMember, hall, van, room, waiting, removed, byRemovedMember);
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/api/listings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await ReadAsync(response);
        Assert.Equal(
            ["Quiet guest room, month to month", "15-passenger van for youth camp", "Sunlit fellowship hall for 80"],
            page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("title").GetString()));
        Assert.Equal(JsonValueKind.Null, page.GetProperty("nextCursor").ValueKind);
        var counts = page.GetProperty("counts");
        Assert.Equal(3, counts.GetProperty("everything").GetInt32());
        Assert.Equal(2, counts.GetProperty("forRent").GetInt32());
        Assert.Equal(1, counts.GetProperty("wanted").GetInt32());
    }

    // L2-001 criteria 3 and 7: a card for rent carries its first photo, kind, title, price, area
    // and church; L2-022: the price is a number of dollars and its period.
    [Fact]
    public async Task A_card_for_rent_carries_its_first_photo_price_area_and_church()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var photoId = Guid.NewGuid();
        var hall = TestData.ForRent(dan, "Sunlit fellowship hall for 80", TestData.At(2), new Price(1250.50m, PricePeriod.Week), "Walnut Grove, Langley", photoId);
        await _factory.SeedAsync(TestData.Grace, dan, hall);
        using var client = _factory.CreateHttpsClient();

        var card = (await GetFirstCardAsync(client));

        Assert.Equal(hall.Id, card.GetProperty("id").GetGuid());
        Assert.Equal("for-rent", card.GetProperty("offer").GetString());
        Assert.Equal("space", card.GetProperty("kind").GetString());
        Assert.Equal(1250.50m, card.GetProperty("price").GetProperty("amount").GetDecimal());
        Assert.Equal("week", card.GetProperty("price").GetProperty("period").GetString());
        Assert.Equal("Walnut Grove, Langley", card.GetProperty("area").GetString());
        Assert.Equal(JsonValueKind.Null, card.GetProperty("distanceKm").ValueKind);
        Assert.Equal("Weekdays and Saturdays", card.GetProperty("when").GetProperty("text").GetString());
        Assert.Equal("Pastor Dan Whitaker", card.GetProperty("posterName").GetString());
        Assert.Equal("Grace Community Church", card.GetProperty("churchName").GetString());
        var photo = card.GetProperty("photo");
        Assert.Equal($"/api/photos/{photoId}/card", photo.GetProperty("url").GetString());
        Assert.Equal(800, photo.GetProperty("width").GetInt32());
        Assert.Equal(600, photo.GetProperty("height").GetInt32());
        Assert.Equal("A bright hall with round tables", photo.GetProperty("description").GetString());
    }

    // L2-001 criteria 4 and 8: a wanted card has no photo; it carries when, poster, church and
    // area, and its price only when one was given.
    [Fact]
    public async Task A_wanted_card_has_no_photo_and_carries_its_dates_and_poster()
    {
        var marcus = TestData.Member("Marcus Lee", TestData.NewSong);
        var van = TestData.Wanted(marcus, "15-passenger van for youth camp", TestData.At(5));
        await _factory.SeedAsync(TestData.NewSong, marcus, van);
        using var client = _factory.CreateHttpsClient();

        var card = await GetFirstCardAsync(client);

        Assert.Equal("wanted", card.GetProperty("offer").GetString());
        Assert.Equal("thing", card.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, card.GetProperty("photo").ValueKind);
        Assert.Equal(JsonValueKind.Null, card.GetProperty("price").ValueKind);
        var when = card.GetProperty("when");
        Assert.Equal(JsonValueKind.Null, when.GetProperty("text").ValueKind);
        Assert.Equal("2026-07-14", when.GetProperty("start").GetString());
        Assert.Equal("2026-07-18", when.GetProperty("end").GetString());
        Assert.Equal("Marcus Lee", card.GetProperty("posterName").GetString());
        Assert.Equal("New Song Fellowship", card.GetProperty("churchName").GetString());
    }

    private static async Task<JsonElement> GetFirstCardAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/listings", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await ReadAsync(response)).GetProperty("items")[0];
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
}
