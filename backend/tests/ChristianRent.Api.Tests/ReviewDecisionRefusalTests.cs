// Acceptance Test
// Traces to: L2-018, L2-020, L2-025
// Description: A decision is refused for anyone but an admin, for a second decision on the same item, for one the item's kind does not allow and for an unknown item; a refused decision changes nothing.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Api.Tests;

public sealed class ReviewDecisionRefusalTests : IDisposable
{
    private readonly RacingApiFactory _factory = new();
    private readonly Member _naomi = TestData.Admin("Naomi Friesen", "naomi-friesen");
    private readonly Member _ruth = TestData.Admin("Ruth Okafor", "ruth-okafor");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Listing _yard;
    private readonly ReviewItem _item;

    public ReviewDecisionRefusalTests()
    {
        _yard = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        _item = ReviewItem.ForNewListing(_yard.Id, TestData.At(8, 12));
    }

    public void Dispose() => _factory.Dispose();

    // L2-018 criterion 5; L2-025 criterion 1: only an admin decides, and nothing changes otherwise.
    [Theory]
    [InlineData("dan-whitaker", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    public async Task Anyone_but_an_admin_is_refused(string? signInId, HttpStatusCode status, string code)
    {
        await SeedAsync();
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await DecideAsync(client, "approve");

        Assert.Equal((status, code), (response.StatusCode, (await Problem.ReadAsync(response)).Code));
        await AssertUnchangedAsync();
    }

    // L2-020 criteria 5 and 13: a second decision is refused with the first and its time, and the
    // first stands.
    [Fact]
    public async Task A_second_decision_is_refused_with_the_first()
    {
        await SeedAsync();
        using var naomi = _factory.CreateSignedInClient("naomi-friesen");
        using var first = await DecideAsync(naomi, "approve");
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        using var ruth = _factory.CreateSignedInClient("ruth-okafor");

        using var response = await DecideAsync(ruth, "remove");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("already_decided", problem.Code);
        Assert.Equal("approve", problem.Body.GetProperty("decision").GetString());
        Assert.Equal(_factory.Clock.GetUtcNow().AddMinutes(-5), problem.Body.GetProperty("decidedAt").GetDateTimeOffset());
        var listing = await _factory.ReadAsync(database => database.Listings.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal(ListingStatus.Approved, listing.Status);
    }

    // L2-020 criterion 5; ADR 0025: when another admin's decision is saved while this one is being
    // made, the token check refuses this one and nothing of it is saved.
    [Fact]
    public async Task A_decision_overtaken_by_another_admins_is_refused()
    {
        await SeedAsync();
        var overtakenAt = _factory.Clock.GetUtcNow();
        _factory.BeforeSave = async database =>
        {
            _factory.BeforeSave = null;
            var item = await database.ReviewItems.SingleAsync(TestContext.Current.CancellationToken);
            item.Decide(ReviewDecision.Remove, _ruth.Id, overtakenAt);
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        };
        using var naomi = _factory.CreateSignedInClient("naomi-friesen");

        using var response = await DecideAsync(naomi, "approve");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal(("already_decided", "remove"), (problem.Code, problem.Body.GetProperty("decision").GetString()));
        var listing = await _factory.ReadAsync(database => database.Listings.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal(ListingStatus.WaitingForReview, listing.Status);
    }

    // L2-020 criterion 8; ADR 0025: a decision the kind does not allow, a word that is not a
    // decision and an unknown item are refused, and change nothing.
    [Theory]
    [InlineData("keep", null, HttpStatusCode.Conflict, "decision_not_allowed")]
    [InlineData("maybe", null, HttpStatusCode.BadRequest, "validation_failed")]
    [InlineData("approve", "5d0c0a80-0000-4000-8000-000000000000", HttpStatusCode.NotFound, "not_found")]
    [InlineData("approve", "not-an-id", HttpStatusCode.NotFound, "not_found")]
    public async Task A_decision_that_cannot_be_made_is_refused(string decision, string? id, HttpStatusCode status, string code)
    {
        await SeedAsync();
        using var naomi = _factory.CreateSignedInClient("naomi-friesen");

        using var response = await naomi.PostAsJsonAsync(
            $"/api/review-queue/{id ?? _item.Id.ToString()}/decision", new { decision }, TestContext.Current.CancellationToken);

        Assert.Equal((status, code), (response.StatusCode, (await Problem.ReadAsync(response)).Code));
        await AssertUnchangedAsync();
    }

    private Task SeedAsync() => _factory.SeedAsync(TestData.Grace, _naomi, _ruth, _dan, _yard, _item);

    private Task<HttpResponseMessage> DecideAsync(HttpClient client, string decision) =>
        client.PostAsJsonAsync($"/api/review-queue/{_item.Id}/decision", new { decision }, TestContext.Current.CancellationToken);

    private async Task AssertUnchangedAsync()
    {
        var item = await _factory.ReadAsync(database => database.ReviewItems.SingleAsync(TestContext.Current.CancellationToken));
        var listing = await _factory.ReadAsync(database => database.Listings.SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal((null, ListingStatus.WaitingForReview), (item.Decision, listing.Status));
    }
}
