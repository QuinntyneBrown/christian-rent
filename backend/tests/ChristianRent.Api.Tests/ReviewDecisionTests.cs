// Acceptance Test
// Traces to: L2-018, L2-020, L2-025
// Description: POST /api/review-queue/{id}/decision lets an admin approve, keep or remove what waits, records who decided what and when, and refuses a second decision.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Api.Tests;

public sealed class ReviewDecisionTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _naomi = TestData.Admin("Naomi Friesen", "naomi-friesen");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");

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
}
