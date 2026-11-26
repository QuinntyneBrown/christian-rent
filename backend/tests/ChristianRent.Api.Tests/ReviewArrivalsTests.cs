// Acceptance Test
// Traces to: L2-019, L2-025
// Description: The first page of the review queue says when it was read, and GET /api/review-queue/arrivals counts by kind what has begun to wait since then, for an admin alone.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewArrivalsTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    private HttpClient Admin() => _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

    // L2-019 criterion 12: given an admin read the queue, when items arrive, then asking since
    // that reading counts them by kind; what waited already, and what was decided, is not counted.
    [Fact]
    public async Task What_arrived_since_the_queue_was_read_is_counted_by_kind()
    {
        var old = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        await _factory.SeedAsync(TestData.Grace, TestData.StPauls, _dan, _alicia, _sarah, old, ReviewItem.ForNewListing(old.Id, TestData.At(7)));
        using var admin = Admin();
        var page = await ReadAsync(admin, "/api/review-queue");
        Assert.Equal(_factory.Clock.GetUtcNow(), page.GetProperty("asOf").GetDateTimeOffset());
        var since = Uri.EscapeDataString(page.GetProperty("asOf").GetString()!);
        Assert.Equal((0, 0, 0), await ArrivalsAsync(admin, since));

        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        var now = _factory.Clock.GetUtcNow();
        var first = TestData.ForRent(_dan, "Church van on Saturdays", approvedAt: null);
        var second = TestData.Wanted(_dan, "Storage locker for our food bank", approvedAt: null);
        var third = TestData.ForRent(_dan, "A listing already decided", approvedAt: null);
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var report = Report.File(hall, _sarah.Id, ReportReason.Scam, null, now);
        var decided = ReviewItem.ForNewListing(third.Id, now);
        decided.Decide(ReviewDecision.Approve, Guid.NewGuid(), now);
        await _factory.SeedAsync(
            first, second, third, hall, report, decided,
            ReviewItem.ForNewListing(first.Id, now),
            ReviewItem.ForNewListing(second.Id, now),
            ReviewItem.ForReport(report.Id, now),
            ReviewItem.ForNewMember(_alicia.Id, now));

        Assert.Equal((2, 1, 1), await ArrivalsAsync(admin, since));
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("sarah-kim", HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Only_an_admin_asks_what_arrived(string? signInId, HttpStatusCode status, string code)
    {
        await _factory.SeedAsync(TestData.Grace, _sarah);
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.GetAsync(
            "/api/review-queue/arrivals?since=2026-06-08T15%3A00%3A00Z", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?since=yesterday")]
    [InlineData("?since=2026-06-08")]
    [InlineData("?since=2026-06-08T15%3A00%3A00")]
    public async Task A_time_the_API_could_not_have_given_is_refused(string query)
    {
        using var admin = Admin();

        using var response = await admin.GetAsync($"/api/review-queue/arrivals{query}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("since_invalid", (await Problem.ReadAsync(response)).Code);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task<(int, int, int)> ArrivalsAsync(HttpClient client, string since)
    {
        var answer = await ReadAsync(client, $"/api/review-queue/arrivals?since={since}");
        return (
            answer.GetProperty("newListings").GetInt32(),
            answer.GetProperty("reports").GetInt32(),
            answer.GetProperty("newMembers").GetInt32());
    }
}
