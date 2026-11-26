// Acceptance Test
// Traces to: L2-019, L2-025, L2-030
// Description: GET /api/review-queue answers an admin the review items that still wait, oldest first, 50 a page by cursor, with how many wait, and refuses everyone else with no queue data.
using System.Net;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewQueueTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    private HttpClient Admin() => _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

    private static DateTimeOffset Minute(int minute) => new(2026, 6, 8, 12, minute, 0, TimeSpan.Zero);

    // L2-019 criteria 1 and 6: new listings, reports and new members, oldest first, each with
    // its kind, its title or name, who posted or which church, and since when it waits.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task An_admin_reads_what_waits_oldest_first()
    {
        var photoId = Guid.NewGuid();
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null, photoId: photoId);
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var report = Report.File(hall, _sarah.Id, ReportReason.Scam, "Asks for cash.", Minute(20));
        var locker = TestData.Wanted(_dan, "Storage locker for our food bank", approvedAt: null);
        await _factory.SeedAsync(
            TestData.Grace, TestData.StPauls, _dan, _alicia, _sarah, garden, hall, locker, report,
            ReviewItem.ForNewListing(locker.Id, Minute(30)),
            ReviewItem.ForReport(report.Id, Minute(20)),
            ReviewItem.ForNewListing(garden.Id, Minute(0)),
            ReviewItem.ForNewMember(_alicia.Id, Minute(10)));
        using var admin = Admin();

        var page = await ReadAsync(admin, "/api/review-queue");

        Assert.Equal(4, page.GetProperty("waitingCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, page.GetProperty("nextCursor").ValueKind);
        var items = page.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(["new-listing", "new-member", "report", "new-listing"], items.Select(item => item.GetProperty("kind").GetString()));
        Assert.Equal(
            ["Backyard garden for gatherings", "Dr. Alicia Gomez", "Sunlit fellowship hall for 80", "Storage locker for our food bank"],
            items.Select(item => item.GetProperty("title").GetString()));
        Assert.Equal(
            ["Pastor Dan Whitaker", "St. Paul’s Anglican", "Pastor Dan Whitaker", "Pastor Dan Whitaker"],
            items.Select(item => item.GetProperty("who").GetString()));
        Assert.Equal([Minute(0), Minute(10), Minute(20), Minute(30)], items.Select(item => item.GetProperty("waitingSince").GetDateTimeOffset()));
        Assert.Equal(["for-rent", null, "for-rent", "wanted"], items.Select(item => item.GetProperty("offer").GetString()));
        Assert.Equal($"/api/photos/{photoId}/thumb", items[0].GetProperty("thumbUrl").GetString());
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("thumbUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, items[3].GetProperty("thumbUrl").ValueKind);
        // L2-019 criterion 8: nothing in the queue names the reporter or carries the note.
        var text = page.ToString();
        Assert.DoesNotContain("Sarah Kim", text, StringComparison.Ordinal);
        Assert.DoesNotContain("Asks for cash", text, StringComparison.Ordinal);
    }

    // L2-019 criteria 4 and 10; L2-030 criterion 3: 50 a page, then the rest by cursor, with
    // items made at the same instant neither repeated nor missed.
    [Fact]
    public async Task More_than_fifty_waiting_items_load_in_pages()
    {
        var members = Enumerable.Range(1, 63).Select(number => TestData.Member($"Member {number:00}", TestData.Grace, isVerified: false)).ToList();
        await _factory.SeedAsync(
        [
            TestData.Grace,
            .. members,
            .. members.Select((member, index) => ReviewItem.ForNewMember(member.Id, Minute(index / 7))),
        ]);
        using var admin = Admin();

        var first = await ReadAsync(admin, "/api/review-queue");
        var second = await ReadAsync(admin, $"/api/review-queue?cursor={first.GetProperty("nextCursor").GetString()}");

        Assert.Equal(50, first.GetProperty("items").GetArrayLength());
        Assert.Equal(63, first.GetProperty("waitingCount").GetInt32());
        Assert.Equal(13, second.GetProperty("items").GetArrayLength());
        Assert.Equal(63, second.GetProperty("waitingCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        var all = first.GetProperty("items").EnumerateArray().Concat(second.GetProperty("items").EnumerateArray()).ToList();
        Assert.Equal(63, all.Select(item => item.GetProperty("id").GetGuid()).Distinct().Count());
        var since = all.Select(item => item.GetProperty("waitingSince").GetDateTimeOffset()).ToList();
        Assert.Equal(since.Order(), since);
    }

    // L2-030 criterion 3; a cursor is one the API gave.
    [Theory]
    [InlineData("size=51", "page_size_out_of_range")]
    [InlineData("size=0", "page_size_out_of_range")]
    [InlineData("cursor=nonsense", "cursor_invalid")]
    public async Task A_page_the_queue_cannot_give_is_refused(string query, string code)
    {
        using var admin = Admin();

        using var response = await admin.GetAsync($"/api/review-queue?{query}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
    }

    // L2-019 criterion 5; L2-025 criteria 1 and 3: nobody but an admin reads the queue.
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("sarah-kim", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("not-a-member", HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Anyone_but_an_admin_is_refused_with_no_queue_data(string? signInId, HttpStatusCode status, string code)
    {
        await _factory.SeedAsync(TestData.Grace, _sarah, ReviewItem.ForNewMember(_sarah.Id, Minute(0)));
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.GetAsync("/api/review-queue", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal(code, problem.Code);
        Assert.False(problem.Body.TryGetProperty("items", out _));
        Assert.False(problem.Body.TryGetProperty("waitingCount", out _));
    }

    // L2-019 criterion 18: an item whose subject no longer waits is not listed or counted.
    [Fact]
    public async Task An_item_whose_subject_no_longer_waits_is_not_listed()
    {
        var departed = TestData.Member("Gone Member", TestData.Grace, isVerified: false);
        departed.Depart(Minute(5));
        var removed = TestData.Member("Removed Member", TestData.Grace, isVerified: false);
        removed.Remove();
        var orphan = ReviewItem.ForNewListing(Guid.NewGuid(), Minute(0));
        var published = TestData.ForRent(_dan, "Already public", TestData.At(5));
        var theirs = TestData.ForRent(departed, "Posted by a member who left", approvedAt: null);
        var theirHall = TestData.ForRent(removed, "Reported, poster removed", TestData.At(5));
        var onTheirs = Report.File(theirHall, _sarah.Id, ReportReason.Scam, note: null, Minute(1));
        var takenDown = TestData.ForRent(_dan, "Reported, taken down", TestData.At(5));
        takenDown.Remove();
        var onTakenDown = Report.File(takenDown, _sarah.Id, ReportReason.Scam, note: null, Minute(2));
        var waiting = TestData.ForRent(_dan, "Still waiting", approvedAt: null);
        await _factory.SeedAsync(
            TestData.Grace, _dan, _sarah, departed, removed, published, theirs, theirHall, takenDown, waiting,
            onTheirs, onTakenDown, orphan,
            ReviewItem.ForNewListing(published.Id, Minute(1)),
            ReviewItem.ForNewListing(theirs.Id, Minute(2)),
            ReviewItem.ForReport(onTheirs.Id, Minute(3)),
            ReviewItem.ForReport(onTakenDown.Id, Minute(4)),
            ReviewItem.ForReport(Guid.NewGuid(), Minute(5)),
            ReviewItem.ForNewMember(departed.Id, Minute(6)),
            ReviewItem.ForNewMember(removed.Id, Minute(7)),
            ReviewItem.ForNewMember(Guid.NewGuid(), Minute(8)),
            ReviewItem.ForNewListing(waiting.Id, Minute(9)));
        using var admin = Admin();

        var page = await ReadAsync(admin, "/api/review-queue");

        Assert.Equal(["Still waiting"], page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("title").GetString()));
        Assert.Equal(1, page.GetProperty("waitingCount").GetInt32());
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        return document.RootElement.Clone();
    }
}
