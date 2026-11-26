// Acceptance Test
// Traces to: L2-021, L2-025
// Description: POST /api/listings/{listingId}/reports files a member's report with its review item in the review queue, answers only when it was filed, and changes nothing on the listing.
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

public sealed class ReportListingTests : IDisposable
{
    internal const string Note = "It asks people to pay a deposit before they have seen the hall.";

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim", isVerified: false);

    public void Dispose() => _factory.Dispose();

    // L2-021 criteria 1, 2 and 4: a member's report of an approved listing is stored with its
    // reason and note, and waits in the review queue; the answer names no reporter and carries
    // no note; the listing stays public.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_members_report_enters_the_review_queue()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{hall.Id}/reports", new { reason = "scam", note = Note }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["reportedAt"], answer.EnumerateObject().Select(property => property.Name));
        Assert.Equal(_factory.Clock.GetUtcNow(), answer.GetProperty("reportedAt").GetDateTimeOffset());

        var report = Assert.Single(await ReportsAsync());
        Assert.Equal(hall.Id, report.ListingId);
        Assert.Equal(_sarah.Id, report.ReporterId);
        Assert.Equal(ReportReason.Scam, report.Reason);
        Assert.Equal(Note, report.Note);
        Assert.Equal(_factory.Clock.GetUtcNow(), report.CreatedAt);
        Assert.Equal(ReportStatus.Open, report.Status);

        var item = Assert.Single(await ReviewItemsAsync());
        Assert.Equal(ReviewItemKind.Report, item.Kind);
        Assert.Equal(report.Id, item.SubjectId);
        Assert.Equal(_factory.Clock.GetUtcNow(), item.CreatedAt);

        using var anyone = _factory.CreateHttpsClient();
        using var read = await anyone.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
    }

    private async Task<List<Report>> ReportsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Reports.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
    }

    private async Task<List<ReviewItem>> ReviewItemsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().ReviewItems.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
    }
}
