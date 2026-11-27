// Acceptance Test
// Traces to: L2-020, L2-021
// Description: Deciding through the API: Remove keeps a new listing from ever being public; Keep closes a report and leaves the listing public; Remove takes a reported listing down, closes every report on it and records one notice for its poster.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class DecideReportTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace);
    private readonly Member _marcus = TestData.Member("Marcus Lee", TestData.NewSong);
    private readonly Guid _naomi = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    private HttpClient Admin() => _factory.CreateMemberClient(_naomi, admin: true);

    // L2-020 criteria 1 and 20: a removed new listing never becomes public, leaves the queue,
    // and a notice is recorded for the member who posted it.
    [Fact]
    public async Task A_removed_new_listing_never_becomes_public()
    {
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(garden.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.Grace, _dan, garden, item);
        using var admin = Admin();

        await DecideAsync(admin, item.Id, "remove");

        await AssertNotPublicAsync(garden.Id);
        Assert.Equal(0, (await ReadAsync(admin, "/api/admin/review-queue")).GetProperty("waitingCount").GetInt32());
        var notice = Assert.Single(await StoredAsync(database => database.ListingRemovalNotices.ToListAsync()));
        Assert.Equal((_dan.Id, garden.Id, _factory.Clock.GetUtcNow()), (notice.MemberId, notice.ListingId, notice.CreatedAt));
    }

    // L2-020 criteria 2 and 8: Keep closes that report alone; the listing stays public and
    // another report on it still waits.
    [Fact]
    public async Task A_kept_listing_stays_public_and_only_that_report_leaves()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var first = Report.File(hall, _sarah.Id, ReportReason.Scam, null, TestData.At(6));
        var second = Report.File(hall, _marcus.Id, ReportReason.NotARealListing, null, TestData.At(7));
        var firstItem = ReviewItem.ForReport(first.Id, TestData.At(6));
        var secondItem = ReviewItem.ForReport(second.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.Grace, TestData.NewSong, _dan, _sarah, _marcus, hall, first, second, firstItem, secondItem);
        using var admin = Admin();
        var detail = await ReadAsync(admin, $"/api/admin/review-queue/{firstItem.Id}");
        Assert.Equal(["keep", "remove"], detail.GetProperty("allowedDecisions").EnumerateArray().Select(value => value.GetString()));

        var closed = await DecideAsync(admin, firstItem.Id, "keep");

        Assert.Equal([firstItem.Id], closed);
        using var anyone = _factory.CreateHttpsClient();
        using var read = await anyone.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        var queue = await ReadAsync(admin, "/api/admin/review-queue");
        Assert.Equal([secondItem.Id], queue.GetProperty("items").EnumerateArray().Select(row => row.GetProperty("id").GetGuid()));
        var reports = await StoredAsync(database => database.Reports.ToDictionaryAsync(report => report.Id, report => report.Status));
        Assert.Equal((ReportStatus.Closed, ReportStatus.Open), (reports[first.Id], reports[second.Id]));
        Assert.Empty(await StoredAsync(database => database.ListingRemovalNotices.ToListAsync()));
    }

    // L2-020 criteria 2, 6, 7 and 20; L2-021 criterion 4: Remove takes the listing down, decides
    // every waiting item about it, closes each report, and records one notice that names no
    // reporter. What waits about another listing stays.
    [Fact]
    public async Task Removing_a_reported_listing_closes_every_report_on_it()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var van = TestData.Wanted(_marcus, "15-passenger van for youth camp", TestData.At(5));
        var first = Report.File(hall, _sarah.Id, ReportReason.Scam, null, TestData.At(6));
        var second = Report.File(hall, _marcus.Id, ReportReason.NotARealListing, null, TestData.At(7));
        var other = Report.File(van, _sarah.Id, ReportReason.SomethingElse, null, TestData.At(7));
        var firstItem = ReviewItem.ForReport(first.Id, TestData.At(6));
        var secondItem = ReviewItem.ForReport(second.Id, TestData.At(7));
        var otherItem = ReviewItem.ForReport(other.Id, TestData.At(8));
        await _factory.SeedAsync(
            TestData.Grace, TestData.NewSong, _dan, _sarah, _marcus, hall, van, first, second, other, firstItem, secondItem, otherItem);
        using var admin = Admin();

        var closed = await DecideAsync(admin, secondItem.Id, "remove");

        Assert.Equal(new[] { firstItem.Id, secondItem.Id }.Order(), closed.Order());
        await AssertNotPublicAsync(hall.Id);
        var queue = await ReadAsync(admin, "/api/admin/review-queue");
        Assert.Equal([otherItem.Id], queue.GetProperty("items").EnumerateArray().Select(row => row.GetProperty("id").GetGuid()));
        var items = await StoredAsync(database => database.ReviewItems.Where(item => item.Id != otherItem.Id).ToListAsync());
        Assert.All(items, item => Assert.Equal(
            (ReviewDecision.Remove, _naomi, _factory.Clock.GetUtcNow()),
            (item.Decision!.Value, item.DecidedBy!.Value, item.DecidedAt!.Value)));
        var reports = await StoredAsync(database => database.Reports.ToDictionaryAsync(report => report.Id, report => report.Status));
        Assert.Equal((ReportStatus.Closed, ReportStatus.Closed, ReportStatus.Open), (reports[first.Id], reports[second.Id], reports[other.Id]));
        var notice = Assert.Single(await StoredAsync(database => database.ListingRemovalNotices.ToListAsync()));
        Assert.Equal((_dan.Id, hall.Id), (notice.MemberId, notice.ListingId));
    }

    private async Task AssertNotPublicAsync(Guid listingId)
    {
        using var anyone = _factory.CreateHttpsClient();
        var browse = await ReadAsync(anyone, "/api/listings");
        Assert.DoesNotContain(listingId, browse.GetProperty("items").EnumerateArray().Select(row => row.GetProperty("id").GetGuid()));
        using var read = await anyone.GetAsync($"/api/listings/{listingId}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task<List<Guid>> DecideAsync(HttpClient client, Guid id, string decision)
    {
        using var response = await client.PostAsJsonAsync(
            $"/api/admin/review-queue/{id}/decision", new { decision, version = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return answer.GetProperty("closedItemIds").EnumerateArray().Select(value => value.GetGuid()).ToList();
    }

    private async Task<T> StoredAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = _factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
