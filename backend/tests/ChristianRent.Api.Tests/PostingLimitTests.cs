// Acceptance Test
// Traces to: L2-012, L2-025
// Description: An eleventh listing in 24 hours is refused with post_limit_reached and the time posting reopens; PostingLimit's rule, one case per row.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PostingLimitTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private DateTimeOffset Now => _factory.Clock.GetUtcNow();

    // L2-012 criteria 6 and 10: with 10 listings posted in the last 24 hours, the next is
    // refused with 429, post_limit_reached and when posting reopens; nothing is saved.
    [Fact]
    public async Task An_eleventh_listing_in_24_hours_is_refused_with_the_time_posting_reopens()
    {
        var sarah = await SeedSarahAsync(Enumerable.Range(0, 10).Select(index => Now.AddHours(-20 + index)));
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync("/api/listings", PostListingTests.ForRent(Guid.NewGuid()), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("post_limit_reached", problem.Code);
        Assert.Equal(Now.AddHours(4), problem.Body.GetProperty("retryAt").GetDateTimeOffset());
        Assert.Equal(10, await CountAsync(sarah));
    }

    // Once the oldest of the ten is 24 hours old, the member may post again.
    [Fact]
    public async Task Posting_reopens_once_the_oldest_of_the_ten_is_24_hours_old()
    {
        var sarah = await SeedSarahAsync(Enumerable.Range(0, 10).Select(index => Now.AddHours(-20 + index)));
        using var client = _factory.CreateSignedInClient("sarah-kim");
        _factory.Clock.Advance(TimeSpan.FromHours(4));

        using var response = await client.PostAsJsonAsync("/api/listings", PostListingTests.ForRent(Guid.NewGuid()), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(11, await CountAsync(sarah));
    }

    // L2-012 criterion 4 beside criterion 6: a repeated request for the tenth listing is
    // answered with it, not refused by the limit.
    [Fact]
    public async Task A_repeated_request_for_the_tenth_listing_is_answered_at_the_limit()
    {
        await SeedSarahAsync(Enumerable.Range(0, 9).Select(index => Now.AddHours(-20 + index)));
        using var client = _factory.CreateSignedInClient("sarah-kim");
        var tenth = PostListingTests.ForRent(Guid.NewGuid());
        using var first = await client.PostAsJsonAsync("/api/listings", tenth, TestContext.Current.CancellationToken);

        using var again = await client.PostAsJsonAsync("/api/listings", tenth, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(
            (await first.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid(),
            (await again.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid());
    }

    // The rule of PostingLimit (publish-listing design), one case per row: the hours ago at
    // which the member's listings were created, and when posting reopens, in hours from now,
    // or null when it is open.
    [Theory]
    [InlineData(new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9 }, null)]
    [InlineData(new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 }, 14)]
    [InlineData(new[] { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 }, 24)]
    [InlineData(new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 24 }, null)]
    [InlineData(new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 23, 30, 40 }, 1)]
    [InlineData(new[] { 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 2 }, 2)]
    [InlineData(new int[0], null)]
    public void PostingLimit_says_when_posting_reopens(int[] hoursAgo, int? reopensInHours)
    {
        var now = new DateTimeOffset(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);

        var retryAt = PostingLimit.RetryAt(hoursAgo.Select(hours => now.AddHours(-hours)), now);

        Assert.Equal(reopensInHours is { } hours ? now.AddHours(hours) : null, retryAt);
    }

    private async Task<Member> SeedSarahAsync(IEnumerable<DateTimeOffset> postedAt)
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        var listings = postedAt.Select(at => Listing.Create(
            Guid.NewGuid(), sarah.Id, ListingOffer.ForRent, ListingKind.Thing, "Ladder", new Price(5m, PricePeriod.Day),
            "Weekends", null, null, "Langley", null, at));
        await _factory.SeedAsync([TestData.Grace, sarah, .. listings]);
        return sarah;
    }

    private async Task<int> CountAsync(Member member)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Listings
            .CountAsync(listing => listing.MemberId == member.Id, TestContext.Current.CancellationToken);
    }
}
