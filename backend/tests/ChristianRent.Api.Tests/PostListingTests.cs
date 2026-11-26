// Acceptance Test
// Traces to: L2-009, L2-010, L2-012, L2-025
// Description: POST /api/listings saves a member's listing as waiting for review, puts it in the review queue, keeps it off Browse, and creates one listing per client request.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PostListingTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-012 criteria 1 and 2: a valid listing for rent is saved as waiting for review, enters
    // the review queue as a new listing, and is not public.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_member_posts_a_listing_for_rent_that_waits_for_review_and_is_not_public()
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim", isVerified: false);
        await _factory.SeedAsync(TestData.Grace, sarah);
        using var client = _factory.CreateSignedInClient("sarah-kim");
        var requestId = Guid.NewGuid();

        using var response = await client.PostAsJsonAsync("/api/listings", ForRent(requestId), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var posted = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("waiting-for-review", posted.GetProperty("status").GetString());
        var id = posted.GetProperty("id").GetGuid();

        var (listings, items) = await ReadAsync();
        var listing = Assert.Single(listings);
        Assert.Equal(id, listing.Id);
        Assert.Equal(sarah.Id, listing.MemberId);
        Assert.Equal(requestId, listing.ClientRequestId);
        Assert.Equal(ListingStatus.WaitingForReview, listing.Status);
        Assert.Equal(ListingOffer.ForRent, listing.Offer);
        Assert.Equal(ListingKind.Thing, listing.Kind);
        Assert.Equal("Pressure washer and drill kit", listing.Title);
        Assert.Equal(new Price(25m, PricePeriod.Day), listing.Price);
        Assert.Equal("Most weekends", listing.WhenText);
        Assert.Null(listing.StartDate);
        Assert.Equal("Willoughby, Langley", listing.Area);
        Assert.Equal("Pick up from my garage. Happy to show you how it works.", listing.Note);
        Assert.Equal(_factory.Clock.GetUtcNow(), listing.CreatedAt);
        Assert.Null(listing.ApprovedAt);
        Assert.Empty(listing.Photos);

        var item = Assert.Single(items);
        Assert.Equal(ReviewItemKind.NewListing, item.Kind);
        Assert.Equal(id, item.SubjectId);
        Assert.Equal(_factory.Clock.GetUtcNow(), item.CreatedAt);

        // Not public: nobody else finds it on Browse or by its address; its poster may read it.
        using var anyone = _factory.CreateHttpsClient();
        var page = await anyone.GetFromJsonAsync<JsonElement>("/api/listings", TestContext.Current.CancellationToken);
        Assert.Equal(0, page.GetProperty("items").GetArrayLength());
        using var read = await anyone.GetAsync($"/api/listings/{id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
    }

    // L2-010 criteria 4, 5 and 14: a wanted listing with dates and a budget; a wanted listing
    // may give no price.
    [Fact]
    public async Task A_member_posts_a_wanted_listing_with_dates_and_no_price()
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        await _factory.SeedAsync(TestData.Grace, sarah);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            "/api/listings",
            new
            {
                clientRequestId = Guid.NewGuid(),
                offer = "wanted",
                kind = "thing",
                title = "15-passenger van for youth camp",
                startDate = "2026-07-14",
                endDate = "2026-07-18",
                area = "Murrayville, Langley",
                photoIds = Array.Empty<Guid>(),
            },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var (listings, _) = await ReadAsync();
        var listing = Assert.Single(listings);
        Assert.Equal(ListingOffer.Wanted, listing.Offer);
        Assert.Null(listing.Price);
        Assert.Null(listing.WhenText);
        Assert.Equal(new DateOnly(2026, 7, 14), listing.StartDate);
        Assert.Equal(new DateOnly(2026, 7, 18), listing.EndDate);
        Assert.Null(listing.Note);
    }

    // L2-012 criterion 4: the same client request sent twice creates one listing, and the
    // second answer names it.
    [Fact]
    public async Task Posting_the_same_client_request_twice_creates_one_listing()
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        await _factory.SeedAsync(TestData.Grace, sarah);
        using var client = _factory.CreateSignedInClient("sarah-kim");
        var body = ForRent(Guid.NewGuid());
        using var first = await client.PostAsJsonAsync("/api/listings", body, TestContext.Current.CancellationToken);

        using var second = await client.PostAsJsonAsync("/api/listings", body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        Assert.Equal(firstId, secondId);
        var (listings, items) = await ReadAsync();
        Assert.Single(listings);
        Assert.Single(items);
    }

    // L2-009 criterion 4; L2-025 criteria 1 and 3: a person who is not a member is refused with
    // not_a_member, and someone not signed in with 401; nothing is saved.
    [Theory]
    [InlineData("member-of-nothing", HttpStatusCode.Forbidden, "not_a_member")]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    public async Task Only_a_member_may_post(string? signInId, HttpStatusCode status, string code)
    {
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.PostAsJsonAsync("/api/listings", ForRent(Guid.NewGuid()), TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        var (listings, items) = await ReadAsync();
        Assert.Empty(listings);
        Assert.Empty(items);
    }

    internal static object ForRent(Guid clientRequestId) => new
    {
        clientRequestId,
        offer = "for-rent",
        kind = "thing",
        title = "Pressure washer and drill kit",
        priceAmount = 25m,
        pricePeriod = "day",
        whenText = "Most weekends",
        area = "Willoughby, Langley",
        note = "Pick up from my garage. Happy to show you how it works.",
        photoIds = Array.Empty<Guid>(),
    };

    private async Task<(List<Listing> Listings, List<ReviewItem> Items)> ReadAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listings = await database.Listings.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
        var items = await database.ReviewItems.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
        return (listings, items);
    }
}
