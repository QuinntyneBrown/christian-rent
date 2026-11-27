// Acceptance Test
// Traces to: L2-018, L2-020
// Description: Deciding a new member through the API: Approve verifies the member and not their church; Remove leaves them unable to post or message, with their listings no longer public.
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

public sealed class DecideNewMemberTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false, signInId: "alicia-gomez");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Guid _naomi = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    // L2-018 criteria 1 and 6: an approved new member is verified on their listings; their
    // church, which nobody confirmed, is not.
    [Fact]
    public async Task An_approved_new_member_is_verified_and_their_church_is_not()
    {
        var hall = TestData.ForRent(_alicia, "Parish hall with a kitchen", TestData.At(5));
        var item = ReviewItem.ForNewMember(_alicia.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.StPauls, _alicia, hall, item);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        await DecideAsync(admin, item.Id, "approve");

        using var anyone = _factory.CreateHttpsClient();
        var listing = await ReadAsync(anyone, $"/api/listings/{hall.Id}");
        var poster = listing.GetProperty("poster");
        Assert.True(poster.GetProperty("isVerified").GetBoolean());
        Assert.False(poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
        Assert.Equal(0, (await ReadAsync(admin, "/api/admin/review-queue")).GetProperty("waitingCount").GetInt32());
    }

    // L2-018 criterion 4: a removed member can no longer post or message, and their listings are
    // no longer public; what waited about their listings leaves the queue.
    [Fact]
    public async Task A_removed_member_can_do_nothing_and_their_listings_are_not_public()
    {
        var hall = TestData.ForRent(_alicia, "Parish hall with a kitchen", TestData.At(5));
        var waiting = TestData.ForRent(_alicia, "Parish car park on weekdays", approvedAt: null);
        var dansHall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var item = ReviewItem.ForNewMember(_alicia.Id, TestData.At(7));
        var listingItem = ReviewItem.ForNewListing(waiting.Id, TestData.At(8));
        await _factory.SeedAsync(TestData.Grace, TestData.StPauls, _alicia, _dan, hall, waiting, dansHall, item, listingItem);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        await DecideAsync(admin, item.Id, "remove");

        using var anyone = _factory.CreateHttpsClient();
        using var read = await anyone.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(0, (await ReadAsync(admin, "/api/admin/review-queue")).GetProperty("waitingCount").GetInt32());
        using var alicia = _factory.CreateSignedInClient("alicia-gomez");
        using var message = await alicia.PostAsJsonAsync(
            $"/api/listings/{dansHall.Id}/messages",
            new { text = "Is it free on Friday?", startDate = "2026-06-13", endDate = "2026-06-14" },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Forbidden, message.StatusCode);
        using var post = await alicia.PostAsJsonAsync(
            "/api/listings", PostListingTests.ForRent(Guid.NewGuid()), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Forbidden, post.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .SingleAsync(member => member.Id == _alicia.Id, TestContext.Current.CancellationToken);
        Assert.Equal(MemberStatus.Removed, stored.Status);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task DecideAsync(HttpClient client, Guid id, string decision)
    {
        using var response = await client.PostAsJsonAsync(
            $"/api/admin/review-queue/{id}/decision", new { decision, version = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
