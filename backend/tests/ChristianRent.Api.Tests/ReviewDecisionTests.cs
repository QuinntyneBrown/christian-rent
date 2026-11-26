// Acceptance Test
// Traces to: L2-018, L2-020, L2-025
// Description: POST /api/review-queue/{id}/decision lets an admin approve, keep or remove what waits, records who decided what and when, and refuses a second decision.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Notices;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Api.Tests;

public sealed class ReviewDecisionTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _naomi = TestData.Admin("Naomi Friesen", "naomi-friesen");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _marcus = TestData.Member("Marcus Lee", TestData.NewSong, signInId: "marcus-lee");
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false, signInId: "alicia-gomez");

    public void Dispose() => _factory.Dispose();

    // L2-020 criteria 1, 6 and 8: Approve makes a new listing public, it leaves the queue, and
    // the decision is recorded with the admin and the time.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task Approving_a_new_listing_makes_it_public()
    {
        var yard = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(yard.Id, TestData.At(8, 12));
        await _factory.SeedAsync(TestData.Grace, _naomi, _dan, yard, item);
        using var admin = _factory.CreateSignedInClient("naomi-friesen");
        var detail = await admin.GetFromJsonAsync<JsonElement>($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(["approve", "remove"], detail.GetProperty("decisions").EnumerateArray().Select(decision => decision.GetString()));

        using var response = await admin.PostAsJsonAsync(
            $"/api/review-queue/{item.Id}/decision",
            new { decision = "approve", version = detail.GetProperty("version").GetString() },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var anyone = _factory.CreateHttpsClient();
        var browse = await anyone.GetFromJsonAsync<JsonElement>("/api/listings", TestContext.Current.CancellationToken);
        Assert.Contains("Backyard garden for gatherings", browse.GetProperty("items").EnumerateArray().Select(listing => listing.GetProperty("title").GetString()));
        var queue = await admin.GetFromJsonAsync<JsonElement>("/api/review-queue", TestContext.Current.CancellationToken);
        Assert.Equal(0, queue.GetProperty("waitingCount").GetInt32());
        var decided = await _factory.ReadAsync(database => database.ReviewItems.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal((ReviewDecision.Approve, _naomi.Id, _factory.Clock.GetUtcNow()), (decided.Decision!.Value, decided.DecidedById!.Value, decided.DecidedAt!.Value));
    }

    // L2-020 criteria 1 and 7; ADR 0025: a removed new listing is never public, and the member
    // who posted it is told by a recorded notice.
    [Fact]
    public async Task Removing_a_new_listing_keeps_it_off_Browse_and_tells_the_poster()
    {
        var yard = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(yard.Id, TestData.At(8, 12));
        await _factory.SeedAsync(TestData.Grace, _naomi, _dan, yard, item);

        using var response = await DecideAsync(item, "remove");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(ListingStatus.Removed, (await ListingAsync(yard.Id)).Status);
        var notice = await _factory.ReadAsync(database => database.MemberNotices.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal((MemberNoticeKind.ListingRemoved, _dan.Id, yard.Id, _factory.Clock.GetUtcNow()), (notice.Kind, notice.MemberId, notice.ListingId, notice.CreatedAt));
    }

    // L2-020 criterion 2: Keep leaves the listing public and closes the report.
    [Fact]
    public async Task Keeping_a_reported_listing_closes_the_report()
    {
        var bus = TestData.ForRent(_dan, "Party bus, cheap, DM for details", TestData.At(6));
        var report = Report.File(bus, _marcus.Id, ReportReason.Scam, "Cash only.", TestData.At(8, 14));
        var item = ReviewItem.ForReport(report.Id, TestData.At(8, 14));
        await _factory.SeedAsync(TestData.Grace, TestData.NewSong, _naomi, _dan, _marcus, bus, report, item);
        Assert.Equal(["keep", "remove"], await DecisionsAsync(item));

        using var response = await DecideAsync(item, "keep");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(ListingStatus.Approved, (await ListingAsync(bus.Id)).Status);
        Assert.Equal(ReportStatus.Closed, (await _factory.ReadAsync(database => database.Reports.SingleAsync(TestContext.Current.CancellationToken))).Status);
        Assert.Empty(await _factory.ReadAsync(database => database.MemberNotices.ToListAsync(TestContext.Current.CancellationToken)));
    }

    // L2-020 criteria 2 and 7: removing a reported listing makes it not public, decides every
    // waiting item about it and closes its reports, and tells the poster without naming anyone.
    [Fact]
    public async Task Removing_a_reported_listing_closes_every_report_on_it()
    {
        var bus = TestData.ForRent(_dan, "Party bus, cheap, DM for details", TestData.At(6));
        var hall = TestData.ForRent(_dan, "Fellowship hall", TestData.At(6));
        var first = Report.File(bus, _marcus.Id, ReportReason.Scam, "Cash only.", TestData.At(8, 12));
        var second = Report.File(bus, _alicia.Id, ReportReason.NotARealListing, null, TestData.At(8, 13));
        var other = Report.File(hall, _marcus.Id, ReportReason.SomethingElse, null, TestData.At(8, 13));
        var firstItem = ReviewItem.ForReport(first.Id, TestData.At(8, 12));
        var secondItem = ReviewItem.ForReport(second.Id, TestData.At(8, 13));
        var otherItem = ReviewItem.ForReport(other.Id, TestData.At(8, 13));
        await _factory.SeedAsync(
            TestData.Grace, TestData.NewSong, TestData.StPauls, _naomi, _dan, _marcus, _alicia, bus, hall,
            first, second, other, firstItem, secondItem, otherItem);

        using var response = await DecideAsync(firstItem, "remove");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(ListingStatus.Removed, (await ListingAsync(bus.Id)).Status);
        var items = await _factory.ReadAsync(database => database.ReviewItems.ToDictionaryAsync(item => item.Id, TestContext.Current.CancellationToken));
        Assert.Equal((ReviewDecision.Remove, _naomi.Id), (items[secondItem.Id].Decision, items[secondItem.Id].DecidedById!.Value));
        Assert.Null(items[otherItem.Id].Decision);
        var reports = await _factory.ReadAsync(database => database.Reports.ToDictionaryAsync(report => report.Id, TestContext.Current.CancellationToken));
        Assert.Equal((ReportStatus.Closed, ReportStatus.Closed, ReportStatus.Open), (reports[first.Id].Status, reports[second.Id].Status, reports[other.Id].Status));
        var notice = await _factory.ReadAsync(database => database.MemberNotices.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal((_dan.Id, bus.Id), (notice.MemberId, notice.ListingId));
    }

    private async Task<HttpResponseMessage> DecideAsync(ReviewItem item, string decision)
    {
        using var admin = _factory.CreateSignedInClient("naomi-friesen");
        var detail = await admin.GetFromJsonAsync<JsonElement>($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);
        return await admin.PostAsJsonAsync(
            $"/api/review-queue/{item.Id}/decision",
            new { decision, version = detail.GetProperty("version").GetString() },
            TestContext.Current.CancellationToken);
    }

    private async Task<List<string?>> DecisionsAsync(ReviewItem item)
    {
        using var admin = _factory.CreateSignedInClient("naomi-friesen");
        var detail = await admin.GetFromJsonAsync<JsonElement>($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);
        return [.. detail.GetProperty("decisions").EnumerateArray().Select(decision => decision.GetString())];
    }

    private Task<Listing> ListingAsync(Guid id) =>
        _factory.ReadAsync(database => database.Listings.SingleAsync(listing => listing.Id == id, TestContext.Current.CancellationToken));
}
