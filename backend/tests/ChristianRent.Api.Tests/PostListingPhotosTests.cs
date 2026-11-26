// Acceptance Test
// Traces to: L2-001, L2-007, L2-013, L2-014, L2-025
// Description: POST /api/listings attaches the member's own uploaded photos in order, the first on the card; once approved they are on Browse and Listing and served to anyone; anyone else's photo, one already posted, one named twice or one never uploaded is refused.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PostListingPhotosTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");

    public void Dispose() => _factory.Dispose();

    // L2-013 criterion 1; L2-014 criterion 4; L2-001 criterion 3; L2-007: the photos are kept in
    // the order sent, the first on the card. Once the listing is approved, Browse shows the first,
    // Listing shows them all in order, and anyone is served them from file storage.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_member_posts_a_listing_for_rent_with_their_photos_which_appear_once_it_is_approved()
    {
        await _factory.SeedAsync(TestData.Grace, _sarah);
        using var sarah = _factory.CreateSignedInClient("sarah-kim");
        var first = await UploadAsync(sarah);
        var second = await UploadAsync(sarah);

        using var response = await sarah.PostAsJsonAsync("/api/listings", ForRent([second, first]), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var listing = await database.Listings.SingleAsync(TestContext.Current.CancellationToken);
            Assert.Equal([(second, 0), (first, 1)], listing.Photos.Select(photo => (photo.PhotoId, photo.Position)));
            Assert.All(await database.Photos.ToListAsync(TestContext.Current.CancellationToken), photo => Assert.Equal(id, photo.ListingId));
            listing.Approve(_factory.Clock.GetUtcNow());
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var anyone = _factory.CreateHttpsClient();
        var page = await anyone.GetFromJsonAsync<JsonElement>("/api/listings", TestContext.Current.CancellationToken);
        var card = Assert.Single(page.GetProperty("items").EnumerateArray());
        Assert.Equal($"/api/photos/{second}/card", card.GetProperty("photo").GetProperty("url").GetString());

        var detail = await anyone.GetFromJsonAsync<JsonElement>($"/api/listings/{id}", TestContext.Current.CancellationToken);
        Assert.Equal(
            [$"/api/photos/{second}/gallery", $"/api/photos/{first}/gallery"],
            detail.GetProperty("photos").EnumerateArray().Select(photo => photo.GetProperty("url").GetString()));

        using var photo = await anyone.GetAsync($"/api/photos/{second}/card", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, photo.StatusCode);
        Assert.True(photo.Headers.CacheControl?.Public);
    }

    // L2-025 criterion 2: a photo that is not the member's own photo that no listing names is
    // refused, one case per row, and nothing is saved.
    [Theory]
    [InlineData("another member's")]
    [InlineData("already posted")]
    [InlineData("named twice")]
    [InlineData("never uploaded")]
    public async Task A_photo_that_is_not_the_members_own_unattached_photo_is_refused(string photo)
    {
        await _factory.SeedAsync(TestData.Grace, _sarah, _dan);
        using var sarah = _factory.CreateSignedInClient("sarah-kim");
        using var dan = _factory.CreateSignedInClient("dan-whitaker");
        var own = await UploadAsync(sarah);
        Guid[] photoIds = photo switch
        {
            "another member's" => [own, await UploadAsync(dan)],
            "named twice" => [own, own],
            "never uploaded" => [own, Guid.NewGuid()],
            _ => [own],
        };
        if (photo == "already posted")
        {
            using var posted = await sarah.PostAsJsonAsync("/api/listings", ForRent([own]), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.Created, posted.StatusCode);
        }

        using var response = await sarah.PostAsJsonAsync("/api/listings", ForRent(photoIds), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.True(problem.Body.GetProperty("errors").TryGetProperty("photoIds", out _));
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(photo == "already posted" ? 1 : 0, await database.Listings.CountAsync(TestContext.Current.CancellationToken));
    }

    private static async Task<Guid> UploadAsync(HttpClient client)
    {
        using var response = await client.PostAsync("/api/photos", TestImages.Form(TestImages.Jpeg(800, 600)), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
    }

    private static object ForRent(Guid[] photoIds) => new
    {
        clientRequestId = Guid.NewGuid(),
        offer = "for-rent",
        kind = "thing",
        title = "Pressure washer and drill kit",
        priceAmount = 25m,
        pricePeriod = "day",
        whenText = "Most weekends",
        area = "Willoughby, Langley",
        note = "Pick up from my garage.",
        photoIds,
    };
}
