// Acceptance Test
// Traces to: L2-001, L2-014, L2-029
// Description: GET /api/photos/{id}/{rendition} streams an approved listing's photo from file storage, and nothing else.
using System.Net;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

public sealed class PhotoServingTests : IDisposable
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 0xFF, 0xD9];

    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-014: served from file storage, to anyone, for an approved listing.
    [Fact]
    public async Task An_approved_listings_card_photo_is_streamed_from_file_storage()
    {
        var photoId = Guid.NewGuid();
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        await _factory.SeedAsync(TestData.Grace, dan, TestData.ForRent(dan, "Hall", TestData.At(2), photoId: photoId));
        _factory.PhotoStorage.Put($"{photoId:N}/card.jpg", Jpeg);
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/photos/{photoId}/card", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Jpeg, await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.True(response.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromDays(365), response.Headers.CacheControl?.MaxAge);
    }

    // L2-001 criterion 2; L2-014: what is not public is not served, and the answer reveals nothing.
    // One case per row.
    [Theory]
    [InlineData("waiting")]
    [InlineData("removed")]
    [InlineData("member removed")]
    [InlineData("unknown photo")]
    [InlineData("unknown rendition")]
    [InlineData("not stored")]
    public async Task Any_other_photo_is_not_found(string situation)
    {
        var photoId = Guid.NewGuid();
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var listing = TestData.ForRent(dan, "Hall", situation == "waiting" ? null : TestData.At(2), photoId: photoId);
        if (situation == "removed")
        {
            listing.Remove();
        }

        if (situation == "member removed")
        {
            dan.Remove();
        }

        await _factory.SeedAsync(TestData.Grace, dan, listing);
        if (situation != "not stored")
        {
            _factory.PhotoStorage.Put($"{photoId:N}/card.jpg", Jpeg);
            _factory.PhotoStorage.Put($"{photoId:N}/poster.jpg", Jpeg);
        }

        var path = situation switch
        {
            "unknown photo" => $"/api/photos/{Guid.NewGuid()}/card",
            "unknown rendition" => $"/api/photos/{photoId}/poster",
            _ => $"/api/photos/{photoId}/card",
        };
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
    }
}
