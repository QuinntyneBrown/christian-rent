// Acceptance Test
// Traces to: L2-019, L2-021, L2-025
// Description: GET /api/review-queue/{id} answers an admin everything needed to decide on a new listing, a report or a new member, never naming who reported, and not_found for an item that does not wait.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewItemTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, joinedIn: 2025);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    private HttpClient Admin() => _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

    private static DateTimeOffset Minute(int minute) => new(2026, 6, 8, 12, minute, 0, TimeSpan.Zero);

    // L2-019 criteria 2, 7 and 15: a new listing's detail shows all its fields, every photo in
    // the member's order, who posted it with both verified marks, since when, and when.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_new_listing_is_shown_with_everything_needed_to_decide()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var garden = Listing.Create(
            Guid.NewGuid(), _dan.Id, ListingOffer.ForRent, ListingKind.Space, "Backyard garden for gatherings",
            new Price(150m, PricePeriod.Day), "Fridays and Saturdays", null, null, "Brookswood, Langley", "Seats 30 under string lights.",
            Minute(2),
            [ListingPhoto.Create(second, 1, null), ListingPhoto.Create(first, 0, "A long table on a lawn")]);
        var item = ReviewItem.ForNewListing(garden.Id, Minute(3));
        await _factory.SeedAsync(TestData.Grace, _dan, garden, item);
        using var admin = Admin();

        var detail = await ReadAsync(admin, item.Id);

        Assert.Equal(item.Id, detail.GetProperty("id").GetGuid());
        Assert.Equal("new-listing", detail.GetProperty("kind").GetString());
        Assert.Equal(Minute(3), detail.GetProperty("waitingSince").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("report").ValueKind);
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("member").ValueKind);
        var listing = detail.GetProperty("listing");
        Assert.Equal(garden.Id, listing.GetProperty("id").GetGuid());
        Assert.Equal("for-rent", listing.GetProperty("offer").GetString());
        Assert.Equal("space", listing.GetProperty("kind").GetString());
        Assert.Equal("Backyard garden for gatherings", listing.GetProperty("title").GetString());
        Assert.Equal(150m, listing.GetProperty("price").GetProperty("amount").GetDecimal());
        Assert.Equal("day", listing.GetProperty("price").GetProperty("period").GetString());
        Assert.Equal("Fridays and Saturdays", listing.GetProperty("when").GetProperty("text").GetString());
        Assert.Equal("Brookswood, Langley", listing.GetProperty("area").GetString());
        Assert.Equal("Seats 30 under string lights.", listing.GetProperty("note").GetString());
        Assert.Equal(Minute(2), listing.GetProperty("postedAt").GetDateTimeOffset());
        var photos = listing.GetProperty("photos").EnumerateArray().ToList();
        Assert.Equal(
            [$"/api/photos/{first}/gallery", $"/api/photos/{second}/gallery"],
            photos.Select(photo => photo.GetProperty("url").GetString()));
        Assert.Equal($"/api/photos/{first}/thumb", photos[0].GetProperty("thumbUrl").GetString());
        Assert.Equal("A long table on a lawn", photos[0].GetProperty("description").GetString());
        var poster = listing.GetProperty("poster");
        Assert.Equal("Pastor Dan Whitaker", poster.GetProperty("name").GetString());
        Assert.True(poster.GetProperty("isVerified").GetBoolean());
        Assert.Equal(_dan.JoinedAt, poster.GetProperty("joinedAt").GetDateTimeOffset());
        Assert.Equal("Grace Community Church", poster.GetProperty("church").GetProperty("name").GetString());
        Assert.True(poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    // L2-019 criterion 8: a report's detail shows the listing, the reason, the note, when it was
    // reported and since when the listing has been public, and nothing that names the reporter.
    [Fact]
    public async Task A_report_is_shown_with_its_listing_and_without_its_reporter()
    {
        var hall = TestData.ForRent(_dan, "Party bus, cheap, DM for details", TestData.At(6));
        var report = Report.File(hall, _sarah.Id, ReportReason.Scam, "Asking people to pay cash off the site.", Minute(20));
        var item = ReviewItem.ForReport(report.Id, Minute(20));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall, report, item);
        using var admin = Admin();

        var detail = await ReadAsync(admin, item.Id);

        Assert.Equal("report", detail.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("listing").ValueKind);
        var shown = detail.GetProperty("report");
        Assert.Equal("scam", shown.GetProperty("reason").GetString());
        Assert.Equal("Asking people to pay cash off the site.", shown.GetProperty("note").GetString());
        Assert.Equal(Minute(20), shown.GetProperty("reportedAt").GetDateTimeOffset());
        Assert.Equal(TestData.At(6), shown.GetProperty("publicSince").GetDateTimeOffset());
        Assert.Equal(hall.Id, shown.GetProperty("listing").GetProperty("id").GetGuid());
        Assert.Equal("Pastor Dan Whitaker", shown.GetProperty("listing").GetProperty("poster").GetProperty("name").GetString());
        Assert.Equal(["reason", "note", "reportedAt", "publicSince", "listing"], shown.EnumerateObject().Select(property => property.Name));
        var text = detail.ToString();
        Assert.DoesNotContain("Sarah Kim", text, StringComparison.Ordinal);
        Assert.DoesNotContain(_sarah.Id.ToString(), text, StringComparison.Ordinal);
    }

    // L2-019 criteria 9, 16 and 17: a new member's detail shows when they joined, their church
    // with its city and who entered it, their listings that are not removed, and their messages.
    [Fact]
    public async Task A_new_member_is_shown_with_their_church_their_listings_and_their_messages()
    {
        var alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false);
        var church = Church.Create(TestData.StPauls.Id, TestData.StPauls.Name, TestData.StPauls.City, isVerified: false);
        church.RecordEnteredBy(alicia.Id);
        var office = TestData.Wanted(alicia, "Small office", TestData.At(6));
        var waiting = TestData.ForRent(alicia, "Spare desk", approvedAt: null);
        var removed = TestData.Wanted(alicia, "Removed request", TestData.At(5));
        removed.Remove();
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        var sent = Message.Send(hall, alicia.Id, "Is it free?", null, null, Minute(1));
        var received = Message.Send(office, _dan.Id, "I have one.", null, null, Minute(2));
        var item = ReviewItem.ForNewMember(alicia.Id, Minute(10));
        await _factory.SeedAsync(TestData.Grace, church, _dan, alicia, office, waiting, removed, hall, sent, received, item);
        using var admin = Admin();

        var detail = await ReadAsync(admin, item.Id);

        Assert.Equal("new-member", detail.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("listing").ValueKind);
        var member = detail.GetProperty("member");
        Assert.Equal("Dr. Alicia Gomez", member.GetProperty("name").GetString());
        Assert.Equal(alicia.JoinedAt, member.GetProperty("joinedAt").GetDateTimeOffset());
        var theirs = member.GetProperty("church");
        Assert.Equal(TestData.StPauls.Name, theirs.GetProperty("name").GetString());
        Assert.Equal("Fort Langley", theirs.GetProperty("city").GetString());
        Assert.False(theirs.GetProperty("isVerified").GetBoolean());
        Assert.True(theirs.GetProperty("enteredBy").GetProperty("isThisMember").GetBoolean());
        Assert.Equal("Dr. Alicia Gomez", theirs.GetProperty("enteredBy").GetProperty("name").GetString());
        Assert.Equal(2, member.GetProperty("listingCount").GetInt32());
        Assert.Equal(1, member.GetProperty("forRentCount").GetInt32());
        Assert.Equal(1, member.GetProperty("publicCount").GetInt32());
        Assert.Equal(1, member.GetProperty("messageCount").GetInt32());
        // Nothing the member wrote in a message, and no sign-in, is part of the detail.
        Assert.DoesNotContain("Is it free?", detail.ToString(), StringComparison.Ordinal);
    }

    // L2-019 criterion 16: who entered the church is recorded when a member joins with a new one,
    // and shown to a later member of it as another's; an existing church keeps who entered it.
    [Fact]
    public async Task A_church_records_the_member_who_entered_it()
    {
        using var first = _factory.CreateSignedInClient("alicia");
        using var second = _factory.CreateSignedInClient("mike");
        await JoinAsync(first, new { name = "Dr. Alicia Gomez", newChurchName = "Open Door", newChurchCity = "Surrey", declaresChristian = true });
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await JoinAsync(second, new { name = "Mike Rentals", newChurchName = "open door", newChurchCity = "Surrey", declaresChristian = true });
        using var admin = Admin();
        using var queue = await admin.GetAsync("/api/review-queue", TestContext.Current.CancellationToken);
        var items = (await queue.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken))
            .GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToList();

        var alicia = (await ReadAsync(admin, items[0])).GetProperty("member").GetProperty("church").GetProperty("enteredBy");
        var mike = (await ReadAsync(admin, items[1])).GetProperty("member").GetProperty("church").GetProperty("enteredBy");

        Assert.True(alicia.GetProperty("isThisMember").GetBoolean());
        Assert.False(mike.GetProperty("isThisMember").GetBoolean());
        Assert.Equal("Dr. Alicia Gomez", mike.GetProperty("name").GetString());
    }

    // L2-019 criterion 16: a church whose entrant is not recorded says nothing of one.
    [Fact]
    public async Task A_church_with_no_recorded_entrant_names_none()
    {
        var item = ReviewItem.ForNewMember(_sarah.Id, Minute(0));
        await _factory.SeedAsync(TestData.Grace, _sarah, item);
        using var admin = Admin();

        var member = (await ReadAsync(admin, item.Id)).GetProperty("member");

        Assert.Equal(JsonValueKind.Null, member.GetProperty("church").GetProperty("enteredBy").ValueKind);
        Assert.Equal(0, member.GetProperty("listingCount").GetInt32());
        Assert.Equal(0, member.GetProperty("messageCount").GetInt32());
    }

    // L2-019 criteria 18 and 21: an unknown item, one that no longer waits and an address that is
    // no identifier are answered alike.
    [Fact]
    public async Task An_item_that_does_not_wait_is_not_found()
    {
        var published = TestData.ForRent(_dan, "Already public", TestData.At(5));
        var item = ReviewItem.ForNewListing(published.Id, Minute(0));
        await _factory.SeedAsync(TestData.Grace, _dan, published, item);
        using var admin = Admin();

        foreach (var id in new[] { item.Id.ToString(), Guid.NewGuid().ToString(), "nonsense" })
        {
            using var response = await admin.GetAsync($"/api/review-queue/{id}", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        }
    }

    // L2-019 criterion 5; L2-025: nobody but an admin reads an item.
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("sarah-kim", HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Anyone_but_an_admin_is_refused_an_item(string? signInId, HttpStatusCode status, string code)
    {
        var item = ReviewItem.ForNewMember(_sarah.Id, Minute(0));
        await _factory.SeedAsync(TestData.Grace, _sarah, item);
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.GetAsync($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal(code, problem.Code);
        Assert.False(problem.Body.TryGetProperty("member", out _));
    }

    private static async Task JoinAsync(HttpClient client, object request)
    {
        using var response = await client.PostAsJsonAsync("/api/members", request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, Guid id)
    {
        using var response = await client.GetAsync($"/api/review-queue/{id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
