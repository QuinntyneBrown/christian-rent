// Acceptance Test
// Traces to: L2-014, L2-025
// Description: POST /api/photos refuses a file that is not a JPEG, PNG or WebP by its content, is too large, too small or too large on a side, each with its code; nothing is stored, and only a member may upload.
using System.Net;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PhotoRefusalTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-014 criteria 1 and 2: each refusal through the API, one case per row, whatever the
    // file's name and declared type. Nothing is stored.
    [Theory]
    [InlineData("text named as a JPEG", "photo_type_refused")]
    [InlineData("a GIF", "photo_type_refused")]
    [InlineData("no file", "photo_type_refused")]
    [InlineData("over 10 MB", "photo_too_large")]
    [InlineData("8,001 px wide", "photo_dimensions_too_large")]
    [InlineData("399 × 300 px", "photo_too_small")]
    public async Task A_photo_outside_the_rules_is_refused_with_its_code(string file, string code)
    {
        using var client = await MemberClientAsync();
        using var form = file switch
        {
            "text named as a JPEG" => TestImages.Form("<html>not a photo</html>"u8.ToArray(), "garage.jpg", "image/jpeg"),
            "a GIF" => TestImages.Form(TestImages.Gif, "garage.gif", "image/gif"),
            "no file" => new MultipartFormDataContent { { new StringContent("x"), "note" } },
            "over 10 MB" => TestImages.Form(new byte[PhotoRules.MaxBytes + 1], "garage-raw.jpg", "image/jpeg"),
            "8,001 px wide" => TestImages.Form(TestImages.Png(8001, 300), "panorama.png", "image/png"),
            _ => TestImages.Form(TestImages.Jpeg(399, 300)),
        };

        using var response = await client.PostAsync("/api/photos", form, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        Assert.Empty(_factory.PhotoStorage.Keys);
        Assert.Equal(0, await PhotoCountAsync());
    }

    // L2-025 criterion 1: nobody signed in is answered 401; L2-013 and L2-017 criterion 5: a
    // person who is not a member is refused with not_a_member. Nothing is stored.
    [Theory]
    [InlineData("nobody signed in", HttpStatusCode.Unauthorized, null)]
    [InlineData("not a member", HttpStatusCode.Forbidden, "not_a_member")]
    public async Task Only_a_member_may_upload(string caller, HttpStatusCode status, string? code)
    {
        using var client = caller == "nobody signed in" ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient("new-person");

        using var response = await client.PostAsync("/api/photos", TestImages.Form(TestImages.Jpeg()), TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        if (code is not null)
        {
            Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        }

        Assert.Empty(_factory.PhotoStorage.Keys);
    }

    // The rules of PhotoRules (add-photos design; ADR 0021), checked in order, first match wins,
    // one case per row: the length, the format, then the sides, either way round.
    [Theory]
    [InlineData(10 * 1024 * 1024, "jpeg", 1200, 900, null)]
    [InlineData((10 * 1024 * 1024) + 1, "jpeg", 1200, 900, "photo_too_large")]
    [InlineData((10 * 1024 * 1024) + 1, "none", 0, 0, "photo_too_large")]
    [InlineData(1000, "none", 0, 0, "photo_type_refused")]
    [InlineData(1000, "other", 1200, 900, "photo_type_refused")]
    [InlineData(1000, "png", 1200, 900, null)]
    [InlineData(1000, "webp", 1200, 900, null)]
    [InlineData(1000, "jpeg", 8000, 8000, null)]
    [InlineData(1000, "jpeg", 8001, 300, "photo_dimensions_too_large")]
    [InlineData(1000, "jpeg", 300, 8001, "photo_dimensions_too_large")]
    [InlineData(1000, "jpeg", 400, 300, null)]
    [InlineData(1000, "jpeg", 300, 400, null)]
    [InlineData(1000, "jpeg", 399, 300, "photo_too_small")]
    [InlineData(1000, "jpeg", 400, 299, "photo_too_small")]
    [InlineData(1000, "jpeg", 299, 400, "photo_too_small")]
    public void PhotoRules_refuses_by_the_first_rule_broken(long length, string format, int width, int height, string? code)
    {
        PhotoFacts? facts = format switch
        {
            "none" => null,
            "jpeg" => new PhotoFacts(PhotoFormat.Jpeg, width, height),
            "png" => new PhotoFacts(PhotoFormat.Png, width, height),
            "webp" => new PhotoFacts(PhotoFormat.WebP, width, height),
            _ => new PhotoFacts(PhotoFormat.Other, width, height),
        };

        Assert.Equal(code, PhotoRules.Check(length, facts));
    }

    private async Task<HttpClient> MemberClientAsync()
    {
        var sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
        await _factory.SeedAsync(TestData.Grace, sarah);
        return _factory.CreateSignedInClient("sarah-kim");
    }

    private async Task<int> PhotoCountAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.CountAsync(TestContext.Current.CancellationToken);
    }
}
