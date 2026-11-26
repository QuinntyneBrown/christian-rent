// Acceptance Test
// Traces to: L2-019, L2-021, L2-025
// Description: GET /api/review-queue/{id} answers an admin with everything needed to decide a new listing, a report or a new member, never names a reporter, and refuses everyone else.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewItemDetailTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _naomi = TestData.Admin("Naomi Friesen", "naomi-friesen");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker", joinedIn: 2025);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.NewSong, signInId: "sarah-kim", isVerified: false);

    public void Dispose() => _factory.Dispose();

    // L2-019 criteria 2 and 7: a new listing with all its fields and photos, whether it is for
    // rent or wanted and for a space or a thing, the poster and church with their verified
    // marks, since when the poster has been a member, and when it was posted.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_new_listing_shows_everything_needed_to_decide()
    {
        var photoId = Guid.NewGuid();
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", approvedAt: null, photoId: photoId);
        var item = ReviewItem.ForNewListing(hall.Id, TestData.At(8, 12));
        await _factory.SeedAsync(TestData.Grace, _naomi, _dan, hall, item);

        var detail = await AdminReadsAsync(item.Id);

        Assert.Equal("new-listing", detail.GetProperty("kind").GetString());
        Assert.Equal(TestData.At(8, 12), detail.GetProperty("waitingSince").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("report").ValueKind);
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("member").ValueKind);
        var listing = detail.GetProperty("listing");
        Assert.Equal(hall.Id, listing.GetProperty("id").GetGuid());
        Assert.Equal("for-rent", listing.GetProperty("offer").GetString());
        Assert.Equal("space", listing.GetProperty("kind").GetString());
        Assert.Equal("Sunlit fellowship hall for 80", listing.GetProperty("title").GetString());
        Assert.Equal(45m, listing.GetProperty("price").GetProperty("amount").GetDecimal());
        Assert.Equal("hour", listing.GetProperty("price").GetProperty("period").GetString());
        Assert.Equal("Weekdays and Saturdays", listing.GetProperty("when").GetProperty("text").GetString());
        Assert.Equal("Langley", listing.GetProperty("area").GetString());
        Assert.Equal("Our hall sits empty most of the week.", listing.GetProperty("note").GetString());
        Assert.Equal(hall.CreatedAt, listing.GetProperty("postedAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, listing.GetProperty("approvedAt").ValueKind);
        var photos = listing.GetProperty("photos").EnumerateArray().ToList();
        Assert.Equal(2, photos.Count);
        Assert.Equal($"/api/photos/{photoId}/gallery", photos[0].GetProperty("url").GetString());
        Assert.Equal("A bright hall with round tables", photos[0].GetProperty("description").GetString());
        var poster = listing.GetProperty("poster");
        Assert.Equal("Pastor Dan Whitaker", poster.GetProperty("name").GetString());
        Assert.True(poster.GetProperty("isVerified").GetBoolean());
        Assert.Equal(_dan.JoinedAt, poster.GetProperty("memberSince").GetDateTimeOffset());
        Assert.Equal("Grace Community Church", poster.GetProperty("church").GetProperty("name").GetString());
        Assert.True(poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    // L2-019 criterion 8; L2-021 criterion 4: a report shows the reason, the note, when it was
    // reported and since when the listing has been public, and nothing names the reporter.
    [Fact]
    public async Task A_report_shows_the_reason_and_never_the_reporter()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var report = Report.File(hall, _sarah.Id, ReportReason.Scam, "Asks for a deposit first.", TestData.At(8, 14));
        var item = ReviewItem.ForReport(report.Id, TestData.At(8, 14));
        await _factory.SeedAsync(TestData.Grace, TestData.NewSong, _naomi, _dan, _sarah, hall, report, item);

        var detail = await AdminReadsAsync(item.Id);

        Assert.Equal("report", detail.GetProperty("kind").GetString());
        var reported = detail.GetProperty("report");
        Assert.Equal("scam", reported.GetProperty("reason").GetString());
        Assert.Equal("Asks for a deposit first.", reported.GetProperty("note").GetString());
        Assert.Equal(TestData.At(8, 14), reported.GetProperty("reportedAt").GetDateTimeOffset());
        Assert.Equal(TestData.At(5), detail.GetProperty("listing").GetProperty("approvedAt").GetDateTimeOffset());
        var text = detail.GetRawText();
        Assert.DoesNotContain("Sarah Kim", text);
        Assert.DoesNotContain(_sarah.Id.ToString(), text);
    }

    // L2-019 criterion 9; ADR 0024: a new member with when they joined, the declaration, their
    // church and city, whether it is new and who entered it, their listings and whether they are
    // public, and how many messages they have sent.
    [Fact]
    public async Task A_new_member_shows_their_church_listings_and_messages()
    {
        var bus = TestData.ForRent(_sarah, "Party bus for youth groups", approvedAt: null);
        var chairs = TestData.Wanted(_sarah, "Folding chairs for a picnic", TestData.At(6));
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var item = ReviewItem.ForNewMember(_sarah.Id, TestData.At(8, 11));
        await _factory.SeedAsync(
            TestData.Grace, TestData.NewSong, _naomi, _dan, _sarah, bus, chairs, hall, item,
            Message.Send(hall, _sarah.Id, "Is it free on Saturday?", null, null, TestData.At(7)),
            Message.Send(hall, _sarah.Id, "And the Saturday after?", null, null, TestData.At(7, 10)));

        var detail = await AdminReadsAsync(item.Id);

        Assert.Equal("new-member", detail.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("listing").ValueKind);
        var member = detail.GetProperty("member");
        Assert.Equal("Sarah Kim", member.GetProperty("name").GetString());
        Assert.Equal(_sarah.JoinedAt, member.GetProperty("joinedAt").GetDateTimeOffset());
        var church = member.GetProperty("church");
        Assert.Equal("New Song Fellowship", church.GetProperty("name").GetString());
        Assert.Equal("Langley", church.GetProperty("city").GetString());
        Assert.False(church.GetProperty("isVerified").GetBoolean());
        Assert.False(church.GetProperty("enteredByThisMember").GetBoolean());
        Assert.Equal(JsonValueKind.Null, church.GetProperty("enteredByName").ValueKind);
        var listings = member.GetProperty("listings");
        Assert.Equal(1, listings.GetProperty("forRent").GetInt32());
        Assert.Equal(1, listings.GetProperty("wanted").GetInt32());
        Assert.Equal(1, listings.GetProperty("public").GetInt32());
        Assert.Equal(2, member.GetProperty("messagesSent").GetInt32());
    }

    // ADR 0024: a church a member entered on joining says so, to the admin alone.
    [Fact]
    public async Task A_church_a_member_entered_names_who_entered_it()
    {
        using var alicia = _factory.CreateSignedInClient("alicia-gomez");
        using var tobias = _factory.CreateSignedInClient("tobias-wiebe");
        await _factory.SeedAsync(TestData.Grace, _naomi);
        foreach (var (client, name) in new[] { (alicia, "Dr. Alicia Gomez"), (tobias, "Tobias Wiebe") })
        {
            using var joined = await client.PostAsJsonAsync(
                "/api/members",
                new { name, newChurchName = "St. Paul’s Anglican", newChurchCity = "Fort Langley", declaresChristian = true },
                TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        }

        using var admin = _factory.CreateSignedInClient("naomi-friesen");
        var queue = await admin.GetFromJsonAsync<JsonElement>("/api/review-queue", TestContext.Current.CancellationToken);
        var ids = queue.GetProperty("items").EnumerateArray()
            .ToDictionary(item => item.GetProperty("title").GetString()!, item => item.GetProperty("id").GetGuid());

        var first = (await AdminReadsAsync(ids["Dr. Alicia Gomez"])).GetProperty("member").GetProperty("church");
        var second = (await AdminReadsAsync(ids["Tobias Wiebe"])).GetProperty("member").GetProperty("church");

        Assert.True(first.GetProperty("enteredByThisMember").GetBoolean());
        Assert.Equal("Dr. Alicia Gomez", first.GetProperty("enteredByName").GetString());
        Assert.False(second.GetProperty("enteredByThisMember").GetBoolean());
        Assert.Equal("Dr. Alicia Gomez", second.GetProperty("enteredByName").GetString());
    }

    // L2-025 criterion 2; ADR 0024: an unknown item, an item whose subject has gone and an
    // address that is not an identifier are answered alike, not_found.
    [Theory]
    [InlineData("unknown")]
    [InlineData("gone")]
    [InlineData("not-an-id")]
    public async Task What_is_not_waiting_reveals_nothing(string which)
    {
        var gone = ReviewItem.ForNewListing(Guid.NewGuid(), TestData.At(1));
        await _factory.SeedAsync(TestData.Grace, _naomi, gone);
        using var client = _factory.CreateSignedInClient("naomi-friesen");
        var id = which switch
        {
            "unknown" => Guid.NewGuid().ToString(),
            "gone" => gone.Id.ToString(),
            _ => which,
        };

        using var response = await client.GetAsync($"/api/review-queue/{id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
    }

    // L2-019 criterion 5: a member who is not an admin is refused, with no data.
    [Fact]
    public async Task A_member_is_refused_with_no_data()
    {
        var item = ReviewItem.ForNewMember(_sarah.Id, TestData.At(8));
        await _factory.SeedAsync(TestData.Grace, TestData.NewSong, _naomi, _dan, _sarah, item);
        using var client = _factory.CreateSignedInClient("dan-whitaker");

        using var response = await client.GetAsync($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("not_an_admin", problem.Code);
        Assert.DoesNotContain("Sarah Kim", problem.Body.GetRawText());
    }

    private async Task<JsonElement> AdminReadsAsync(Guid id)
    {
        using var client = _factory.CreateSignedInClient("naomi-friesen");
        return await client.GetFromJsonAsync<JsonElement>($"/api/review-queue/{id}", TestContext.Current.CancellationToken);
    }
}
