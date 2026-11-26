// Acceptance Test
// Traces to: L2-013, L2-014, L2-025
// Description: POST /api/photos stores a member's photo as renditions without metadata in file storage, never in the database, and answers its identifier and addresses.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SkiaSharp;

namespace ChristianRent.Api.Tests;

public sealed class PhotoUploadTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-014 criteria 3 and 4: an accepted photo is stored as its three renditions, each a JPEG
    // of its fitted size with no embedded metadata, in file storage; the database holds only who
    // uploaded it, its dimensions and when.
    [Fact]
    public async Task A_member_uploads_a_photo_that_is_stored_as_renditions_without_its_location()
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        await _factory.SeedAsync(TestData.Grace, sarah);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        var upload = TestImages.Jpeg(1200, 900, withGps: true);
        Assert.True(TestImages.HasExif(upload));
        Assert.Equal((SKEncodedImageFormat.Jpeg, 1200, 900), TestImages.Identify(upload));

        using var response = await client.PostAsync("/api/photos", TestImages.Form(upload), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var id = photo.GetProperty("id").GetGuid();
        Assert.Equal($"/api/photos/{id}", response.Headers.Location?.OriginalString);
        var urls = photo.GetProperty("urls");
        Assert.Equal($"/api/photos/{id}/card", urls.GetProperty("card").GetString());
        Assert.Equal($"/api/photos/{id}/gallery", urls.GetProperty("gallery").GetString());
        Assert.Equal($"/api/photos/{id}/thumb", urls.GetProperty("thumb").GetString());

        Assert.Equal(
            [$"{id:N}/card.jpg", $"{id:N}/gallery.jpg", $"{id:N}/thumb.jpg"],
            _factory.PhotoStorage.Keys.Order(StringComparer.Ordinal));
        foreach (var (rendition, width, height) in new[] { ("card", 800, 600), ("gallery", 1600, 1200), ("thumb", 240, 180) })
        {
            var bytes = _factory.PhotoStorage.Read($"{id:N}/{rendition}.jpg")!;
            Assert.Equal((SKEncodedImageFormat.Jpeg, width, height), TestImages.Identify(bytes));
            Assert.False(TestImages.HasExif(bytes), $"The {rendition} rendition keeps an EXIF block.");
        }

        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await database.Photos.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(id, row.Id);
        Assert.Equal(sarah.Id, row.OwnerId);
        Assert.Null(row.ListingId);
        Assert.Equal((1200, 900), (row.Width, row.Height));
        Assert.Equal(_factory.Clock.GetUtcNow(), row.UploadedAt);
    }

    // L2-014 criterion 1: PNG and WebP are accepted as well as JPEG, by their content.
    [Theory]
    [InlineData("png")]
    [InlineData("webp")]
    public async Task A_png_or_a_webp_photo_is_accepted(string format)
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        await _factory.SeedAsync(TestData.Grace, sarah);
        using var client = _factory.CreateSignedInClient("sarah-kim");
        var bytes = format == "png" ? TestImages.Png(400, 300) : TestImages.Webp(8000, 300);

        using var response = await client.PostAsync(
            "/api/photos", TestImages.Form(bytes, $"photo.{format}", $"image/{format}"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(3, _factory.PhotoStorage.Keys.Count);
    }
}
