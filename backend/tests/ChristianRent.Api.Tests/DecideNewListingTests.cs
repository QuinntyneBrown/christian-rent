// Acceptance Test
// Traces to: L2-020, L2-025
// Description: POST /api/review-queue/{id}/decision lets an admin approve or remove a new listing, records who decided what and when, and takes the item out of the queue.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class DecideNewListingTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Guid _naomi = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    // L2-020 criteria 1 and 6, L2-001 criterion 2: given a new listing that waits, when an admin
    // approves it, then it is public, it leaves the queue, and who decided what and when is kept.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task An_approved_new_listing_becomes_public_and_leaves_the_queue()
    {
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(garden.Id, TestData.At(8));
        await _factory.SeedAsync(TestData.Grace, _dan, garden, item);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);
        using var anyone = _factory.CreateHttpsClient();

        var detail = await ReadAsync(admin, $"/api/review-queue/{item.Id}");
        Assert.Equal(["approve", "remove"], detail.GetProperty("allowedDecisions").EnumerateArray().Select(value => value.GetString()));
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        using var response = await DecideAsync(admin, item.Id, "approve", detail.GetProperty("version").GetInt32());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var decided = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal([item.Id], decided.GetProperty("closedItemIds").EnumerateArray().Select(value => value.GetGuid()));
        var browse = await ReadAsync(anyone, "/api/listings");
        Assert.Equal(
            ["Backyard garden for gatherings"],
            browse.GetProperty("items").EnumerateArray().Select(row => row.GetProperty("title").GetString()));
        var queue = await ReadAsync(admin, "/api/review-queue");
        Assert.Equal(0, queue.GetProperty("waitingCount").GetInt32());
        Assert.Empty(queue.GetProperty("items").EnumerateArray());
        using var gone = await admin.GetAsync($"/api/review-queue/{item.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
        var record = await StoredAsync(database => database.ReviewItems.SingleAsync(stored => stored.Id == item.Id));
        Assert.Equal(ReviewDecision.Approve, record.Decision);
        Assert.Equal(_naomi, record.DecidedBy);
        Assert.Equal(_factory.Clock.GetUtcNow(), record.DecidedAt);
        Assert.Equal(1, record.Version);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static Task<HttpResponseMessage> DecideAsync(HttpClient client, Guid id, string decision, int version) =>
        client.PostAsJsonAsync($"/api/review-queue/{id}/decision", new { decision, version }, TestContext.Current.CancellationToken);

    private async Task<T> StoredAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = _factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
