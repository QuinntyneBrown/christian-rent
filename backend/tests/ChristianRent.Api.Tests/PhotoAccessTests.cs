// Acceptance Test
// Traces to: L2-014, L2-025
// Description: A photo no posted listing names is served to and deletable by its uploader alone; a photo of a listing waiting for review is served to its poster and an admin, privately; anyone else is answered not_found.
using System.Net;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PhotoAccessTests : IDisposable
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 0xFF, 0xD9];

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace);
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);

    public void Dispose() => _factory.Dispose();

    // L2-014 criterion 8; L2-025 criterion 2: an unattached photo is its uploader's alone, served
    // privately; anyone else, an admin included, is answered not_found.
    [Theory]
    [InlineData("uploader", HttpStatusCode.OK)]
    [InlineData("another member", HttpStatusCode.NotFound)]
    [InlineData("an admin", HttpStatusCode.NotFound)]
    [InlineData("nobody signed in", HttpStatusCode.NotFound)]
    public async Task An_unattached_photo_is_served_to_its_uploader_alone(string caller, HttpStatusCode status)
    {
        var photo = await UnattachedAsync();
        using var client = Client(caller);

        using var response = await client.GetAsync($"/api/photos/{photo.Id}/thumb", TestContext.Current.CancellationToken);

        await AssertServedAsync(response, status);
    }

    // L2-014 criterion 5: a photo of a listing waiting for review is served to its poster and to
    // an admin, privately, and to nobody else.
    [Theory]
    [InlineData("uploader", HttpStatusCode.OK)]
    [InlineData("an admin", HttpStatusCode.OK)]
    [InlineData("another member", HttpStatusCode.NotFound)]
    [InlineData("nobody signed in", HttpStatusCode.NotFound)]
    public async Task A_photo_of_a_listing_waiting_for_review_is_served_to_its_poster_and_an_admin(string caller, HttpStatusCode status)
    {
        var photoId = Guid.NewGuid();
        await _factory.SeedAsync(TestData.Grace, _sarah, _dan, TestData.ForRent(_sarah, "Hall", approvedAt: null, photoId: photoId));
        _factory.PhotoStorage.Put($"{photoId:N}/card.jpg", Jpeg);
        using var client = Client(caller);

        using var response = await client.GetAsync($"/api/photos/{photoId}/card", TestContext.Current.CancellationToken);

        await AssertServedAsync(response, status);
    }

    // L2-014 criterion 8: the uploader deletes a photo no listing names; its files and its row go.
    [Fact]
    public async Task The_uploader_deletes_their_unattached_photo()
    {
        var photo = await UnattachedAsync();
        using var client = Client("uploader");

        using var response = await client.DeleteAsync($"/api/photos/{photo.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(_factory.PhotoStorage.Keys);
        Assert.Equal(0, await PhotoCountAsync());
        using var again = await client.GetAsync($"/api/photos/{photo.Id}/thumb", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
    }

    // L2-025 criteria 1 to 3: anyone else is refused, revealing nothing, and the photo stays; so
    // is the uploader once a listing names it.
    [Theory]
    [InlineData("another member", HttpStatusCode.NotFound, "not_found")]
    [InlineData("an admin", HttpStatusCode.NotFound, "not_found")]
    [InlineData("not a member", HttpStatusCode.Forbidden, "not_a_member")]
    [InlineData("nobody signed in", HttpStatusCode.Unauthorized, null)]
    [InlineData("unknown photo", HttpStatusCode.NotFound, "not_found")]
    [InlineData("attached", HttpStatusCode.NotFound, "not_found")]
    public async Task Anyone_else_cannot_delete_a_photo(string situation, HttpStatusCode status, string? code)
    {
        Guid photoId;
        if (situation == "attached")
        {
            photoId = Guid.NewGuid();
            await _factory.SeedAsync(TestData.Grace, _sarah, _dan, TestData.ForRent(_sarah, "Hall", approvedAt: null, photoId: photoId));
            _factory.PhotoStorage.Put($"{photoId:N}/thumb.jpg", Jpeg);
        }
        else
        {
            photoId = (await UnattachedAsync()).Id;
        }

        using var client = Client(situation is "attached" or "unknown photo" ? "uploader" : situation);
        var target = situation == "unknown photo" ? Guid.NewGuid() : photoId;

        using var response = await client.DeleteAsync($"/api/photos/{target}", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        if (code is not null)
        {
            Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        }

        Assert.Contains($"{photoId:N}/thumb.jpg", _factory.PhotoStorage.Keys);
    }

    private async Task<Photo> UnattachedAsync()
    {
        var photo = Photo.Upload(Guid.NewGuid(), _sarah.Id, 1200, 900, _factory.Clock.GetUtcNow());
        await _factory.SeedAsync(TestData.Grace, _sarah, _dan, photo);
        foreach (var rendition in new[] { "card", "gallery", "thumb" })
        {
            _factory.PhotoStorage.Put($"{photo.Id:N}/{rendition}.jpg", Jpeg);
        }

        return photo;
    }

    private HttpClient Client(string caller) => caller switch
    {
        "uploader" => _factory.CreateMemberClient(_sarah.Id),
        "another member" => _factory.CreateMemberClient(_dan.Id),
        "an admin" => _factory.CreateMemberClient(_dan.Id, admin: true),
        "not a member" => _factory.CreateSignedInClient("new-person"),
        _ => _factory.CreateHttpsClient(),
    };

    private static async Task AssertServedAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        if (status == HttpStatusCode.OK)
        {
            Assert.Equal(Jpeg, await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
            Assert.True(response.Headers.CacheControl?.Private);
            Assert.True(response.Headers.CacheControl?.NoStore);
        }
        else
        {
            Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        }
    }

    private async Task<int> PhotoCountAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.CountAsync(TestContext.Current.CancellationToken);
    }
}
