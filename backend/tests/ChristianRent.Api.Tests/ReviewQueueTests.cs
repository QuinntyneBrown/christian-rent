// Acceptance Test
// Traces to: L2-019, L2-025, L2-030
// Description: GET /api/review-queue answers an admin with the waiting new listings, reports and new members, oldest first, in pages of 50, and refuses everyone else with no data.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewQueueTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _naomi = TestData.Admin("Naomi Friesen", "naomi-friesen");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _marcus = TestData.Member("Marcus Lee", TestData.NewSong, signInId: "marcus-lee");
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false, signInId: "alicia-gomez");

    public void Dispose() => _factory.Dispose();

    // L2-019 criteria 1 and 6: new listings, reports and new members, oldest first, each with
    // its kind, its title or name, who posted it or which church, and since when it has waited.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task An_admin_sees_what_waits_oldest_first()
    {
        var photoId = Guid.NewGuid();
        var yard = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null, photoId: photoId);
        var bus = TestData.ForRent(_marcus, "Party bus, cheap, DM for details", TestData.At(6));
        var locker = TestData.Wanted(_marcus, "Storage locker for our food bank", approvedAt: null);
        var report = Report.File(bus, _dan.Id, ReportReason.Scam, "Cash only.", TestData.At(8, 14));
        await _factory.SeedAsync(
            TestData.Grace, TestData.NewSong, TestData.StPauls, _naomi, _dan, _marcus, _alicia, yard, bus, locker, report,
            ReviewItem.ForNewListing(locker.Id, TestData.At(8, 14).AddMinutes(48)),
            ReviewItem.ForReport(report.Id, TestData.At(8, 14).AddMinutes(20)),
            ReviewItem.ForNewMember(_alicia.Id, TestData.At(8, 14)),
            ReviewItem.ForNewListing(yard.Id, TestData.At(8, 12)));
        using var client = _factory.CreateSignedInClient("naomi-friesen");

        var page = await client.GetFromJsonAsync<JsonElement>("/api/review-queue", TestContext.Current.CancellationToken);

        Assert.Equal(4, page.GetProperty("waitingCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, page.GetProperty("nextCursor").ValueKind);
        var items = page.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(
            [
                ("new-listing", "Backyard garden for gatherings", "Pastor Dan Whitaker"),
                ("new-member", "Dr. Alicia Gomez", "St. Paul’s Anglican"),
                ("report", "Party bus, cheap, DM for details", "Marcus Lee"),
                ("new-listing", "Storage locker for our food bank", "Marcus Lee"),
            ],
            items.Select(item => (
                item.GetProperty("kind").GetString(),
                item.GetProperty("title").GetString(),
                item.GetProperty("who").GetString())));
        Assert.Equal(TestData.At(8, 12), items[0].GetProperty("waitingSince").GetDateTimeOffset());
        Assert.Equal("for-rent", items[0].GetProperty("offer").GetString());
        Assert.Equal($"/api/photos/{photoId}/thumb", items[0].GetProperty("thumbUrl").GetString());
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("offer").ValueKind);
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("thumbUrl").ValueKind);
        Assert.Equal("wanted", items[3].GetProperty("offer").GetString());
        Assert.Equal(JsonValueKind.Null, items[3].GetProperty("thumbUrl").ValueKind);
    }

    // L2-019 criteria 4 and 10; L2-030 criterion 3: more than 50 load in pages of 50, by cursor,
    // and every page says how many wait.
    [Fact]
    public async Task More_than_fifty_load_in_pages()
    {
        var members = Enumerable.Range(0, 63)
            .Select(index => TestData.Member($"Member {index:00}", TestData.Grace, isVerified: false))
            .ToList();
        var items = members.Select((member, index) => ReviewItem.ForNewMember(member.Id, TestData.At(1).AddMinutes(index)));
        await _factory.SeedAsync([TestData.Grace, _naomi, .. members, .. items]);
        using var client = _factory.CreateSignedInClient("naomi-friesen");

        var first = await client.GetFromJsonAsync<JsonElement>("/api/review-queue", TestContext.Current.CancellationToken);
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await client.GetFromJsonAsync<JsonElement>(
            $"/api/review-queue?cursor={cursor}", TestContext.Current.CancellationToken);

        Assert.Equal(50, first.GetProperty("items").GetArrayLength());
        Assert.Equal(63, first.GetProperty("waitingCount").GetInt32());
        var rest = second.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("title").GetString()).ToList();
        Assert.Equal(Enumerable.Range(50, 13).Select(index => $"Member {index:00}"), rest);
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Equal(63, second.GetProperty("waitingCount").GetInt32());
    }

    // ADR 0024: an item whose subject has gone (a listing the purge deleted) is neither listed
    // nor counted.
    [Fact]
    public async Task An_item_whose_subject_has_gone_is_not_listed()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", approvedAt: null);
        await _factory.SeedAsync(
            TestData.Grace, _naomi, _dan, hall,
            ReviewItem.ForNewListing(Guid.NewGuid(), TestData.At(1)),
            ReviewItem.ForReport(Guid.NewGuid(), TestData.At(2)),
            ReviewItem.ForNewMember(Guid.NewGuid(), TestData.At(3)),
            ReviewItem.ForNewListing(hall.Id, TestData.At(4)));
        using var client = _factory.CreateSignedInClient("naomi-friesen");

        var page = await client.GetFromJsonAsync<JsonElement>("/api/review-queue", TestContext.Current.CancellationToken);

        var item = Assert.Single(page.GetProperty("items").EnumerateArray());
        Assert.Equal("Sunlit fellowship hall for 80", item.GetProperty("title").GetString());
        Assert.Equal(1, page.GetProperty("waitingCount").GetInt32());
    }

    // L2-019 criterion 5; L2-025 criteria 1 and 4: a member who is not an admin is refused with
    // not_an_admin, and nobody signed in with not_signed_in; neither receives queue data.
    [Theory]
    [InlineData("dan-whitaker", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("not-a-member", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    public async Task Anyone_else_is_refused_with_no_data(string? signInId, HttpStatusCode status, string code)
    {
        await _factory.SeedAsync(TestData.Grace, _naomi, _dan, ReviewItem.ForNewMember(_dan.Id, TestData.At(1)));
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.GetAsync("/api/review-queue", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal(code, problem.Code);
        Assert.False(problem.Body.TryGetProperty("items", out _));
    }

    // ADR 0013 and 0024: a cursor the API did not give is refused.
    [Fact]
    public async Task A_cursor_the_api_did_not_give_is_refused()
    {
        await _factory.SeedAsync(TestData.Grace, _naomi);
        using var client = _factory.CreateSignedInClient("naomi-friesen");

        using var response = await client.GetAsync("/api/review-queue?cursor=nonsense!", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("cursor_invalid", (await Problem.ReadAsync(response)).Code);
    }
}
