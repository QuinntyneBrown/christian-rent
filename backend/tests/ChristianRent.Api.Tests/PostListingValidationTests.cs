// Acceptance Test
// Traces to: L2-010, L2-026
// Description: POST /api/listings refuses invalid fields with validation_failed by the same rules as Post, keeps what a member writes as text, and accepts no photo that was never uploaded.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Listings;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class PostListingValidationTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-010 criterion 9: a request sent straight to the backend with invalid fields is refused,
    // naming each field, and nothing is saved.
    [Fact]
    public async Task A_request_with_nothing_in_it_is_refused_naming_every_required_field()
    {
        using var client = await MemberClientAsync();

        using var response = await client.PostAsJsonAsync("/api/listings", new { title = "PW" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        var errors = problem.Body.GetProperty("errors");
        foreach (var field in new[] { "clientRequestId", "offer", "kind", "title", "whenText", "area" })
        {
            Assert.True(errors.TryGetProperty(field, out _), $"No error for {field} in {errors}");
        }

        Assert.Equal("A title is 3 to 80 characters.", errors.GetProperty("title")[0].GetString());
        Assert.Empty(await ListingsAsync());
    }

    // L2-026 criteria 1 and 2: HTML in a title or a note is stored as the text it is; the
    // one-line fields are trimmed and single-spaced, the note trimmed.
    [Fact]
    public async Task Html_in_a_title_or_a_note_is_kept_as_text()
    {
        using var client = await MemberClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/listings",
            new
            {
                clientRequestId = Guid.NewGuid(),
                offer = "for-rent",
                kind = "space",
                title = "  <b>Hall</b>   <script>alert(1)</script> ",
                priceAmount = 45m,
                pricePeriod = "hour",
                whenText = " Weekday   evenings ",
                area = " Langley ",
                note = "\n<img src=x onerror=alert(1)>\nLine two  \n",
            },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var listing = Assert.Single(await ListingsAsync());
        Assert.Equal("<b>Hall</b> <script>alert(1)</script>", listing.Title);
        Assert.Equal("Weekday evenings", listing.WhenText);
        Assert.Equal("Langley", listing.Area);
        Assert.Equal("<img src=x onerror=alert(1)>\nLine two", listing.Note);
    }

    // ADR 0021: a photo that was never uploaded is not the member's own, so it is refused on
    // photoIds (the other cases are in PostListingPhotosTests).
    [Fact]
    public async Task A_photo_that_was_never_uploaded_is_refused()
    {
        using var client = await MemberClientAsync();
        var body = Command("valid") with { PhotoIds = [Guid.NewGuid()] };

        using var response = await client.PostAsJsonAsync("/api/listings", body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.True(problem.Body.GetProperty("errors").TryGetProperty("photoIds", out _));
        Assert.Empty(await ListingsAsync());
    }

    // The rules of PostListingCommandValidator (compose-listing and publish-listing designs;
    // L2-010 criteria 1 to 7, 9, 11, 12 and 14), one case per row: each changes one field of a
    // valid listing for rent and names the field it makes invalid, or none.
    [Theory]
    [InlineData("valid", null)]
    [InlineData("valid wanted", null)]
    [InlineData("no client request", "ClientRequestId")]
    [InlineData("offer unknown", "Offer")]
    [InlineData("kind unknown", "Kind")]
    [InlineData("title 2", "Title")]
    [InlineData("title 3", null)]
    [InlineData("title 80", null)]
    [InlineData("title 81", "Title")]
    [InlineData("no price for rent", "PriceAmount")]
    [InlineData("no price wanted", null)]
    [InlineData("price 0", null)]
    [InlineData("price negative", "PriceAmount")]
    [InlineData("price 100000", null)]
    [InlineData("price over 100000", "PriceAmount")]
    [InlineData("price with cents", null)]
    [InlineData("price with 3 decimals", "PriceAmount")]
    [InlineData("price over 100000 wanted", "PriceAmount")]
    [InlineData("no period", "PricePeriod")]
    [InlineData("period unknown", "PricePeriod")]
    [InlineData("no when", "WhenText")]
    [InlineData("when 80", null)]
    [InlineData("when 81", "WhenText")]
    [InlineData("when as text and dates", "WhenText")]
    [InlineData("dates", null)]
    [InlineData("dates on one day", null)]
    [InlineData("dates in the past", null)]
    [InlineData("no start date", "StartDate")]
    [InlineData("no end date", "EndDate")]
    [InlineData("end before start", "EndDate")]
    [InlineData("no area", "Area")]
    [InlineData("area 80", null)]
    [InlineData("area 81", "Area")]
    [InlineData("no note", null)]
    [InlineData("note 1000", null)]
    [InlineData("note 1001", "Note")]
    [InlineData("photos on a wanted listing", "PhotoIds")]
    [InlineData("six photos", null)]
    [InlineData("seven photos", "PhotoIds")]
    public void PostListingCommandValidator_names_the_one_invalid_field(string change, string? invalid)
    {
        var result = new PostListingCommandValidator().Validate(Command(change));

        Assert.Equal(invalid is null ? [] : [invalid], result.Errors.Select(error => error.PropertyName).Distinct());
    }

    private static PostListingCommand Command(string change)
    {
        var valid = new PostListingCommand(
            Guid.NewGuid(), "for-rent", "thing", "Pressure washer and drill kit", 25m, "day", "Most weekends",
            null, null, "Willoughby, Langley", "Pick up from my garage.", []);
        var wanted = valid with { Offer = "wanted", PriceAmount = 120m };
        var dates = valid with { WhenText = null, StartDate = new DateOnly(2026, 7, 14), EndDate = new DateOnly(2026, 7, 18) };
        return change switch
        {
            "valid" => valid,
            "valid wanted" => wanted,
            "no client request" => valid with { ClientRequestId = null },
            "offer unknown" => valid with { Offer = "for-sale" },
            "kind unknown" => valid with { Kind = "place" },
            "title 2" => valid with { Title = Text(2) },
            "title 3" => valid with { Title = Text(3) },
            "title 80" => valid with { Title = Text(80) },
            "title 81" => valid with { Title = Text(81) },
            "no price for rent" => valid with { PriceAmount = null, PricePeriod = null },
            "no price wanted" => wanted with { PriceAmount = null, PricePeriod = null },
            "price 0" => valid with { PriceAmount = 0m },
            "price negative" => valid with { PriceAmount = -1m },
            "price 100000" => valid with { PriceAmount = 100_000m },
            "price over 100000" => valid with { PriceAmount = 100_000.01m },
            "price with cents" => valid with { PriceAmount = 1_250.50m },
            "price with 3 decimals" => valid with { PriceAmount = 25.125m },
            "price over 100000 wanted" => wanted with { PriceAmount = 100_001m },
            "no period" => valid with { PricePeriod = null },
            "period unknown" => valid with { PricePeriod = "night" },
            "no when" => valid with { WhenText = "  " },
            "when 80" => valid with { WhenText = Text(80) },
            "when 81" => valid with { WhenText = Text(81) },
            "when as text and dates" => dates with { WhenText = "Most weekends" },
            "dates" => dates,
            "dates on one day" => dates with { EndDate = dates.StartDate },
            "dates in the past" => dates with { StartDate = new DateOnly(2020, 1, 1), EndDate = new DateOnly(2020, 1, 2) },
            "no start date" => dates with { StartDate = null },
            "no end date" => dates with { EndDate = null },
            "end before start" => dates with { EndDate = new DateOnly(2026, 7, 13) },
            "no area" => valid with { Area = null },
            "area 80" => valid with { Area = Text(80) },
            "area 81" => valid with { Area = Text(81) },
            "no note" => valid with { Note = null },
            "note 1000" => valid with { Note = $"\n{new string('é', 1000)}\n" },
            "note 1001" => valid with { Note = new string('é', 1001) },
            "photos on a wanted listing" => wanted with { PhotoIds = [Guid.NewGuid()] },
            "six photos" => valid with { PhotoIds = [.. Enumerable.Range(0, 6).Select(_ => Guid.NewGuid())] },
            "seven photos" => valid with { PhotoIds = [.. Enumerable.Range(0, 7).Select(_ => Guid.NewGuid())] },
            _ => throw new ArgumentOutOfRangeException(nameof(change)),
        };
    }

    /// <summary>Text of that many characters, with spaces around it that do not count.</summary>
    private static string Text(int length) => $"  {new string('é', length)} ";

    private async Task<HttpClient> MemberClientAsync()
    {
        await _factory.SeedAsync(TestData.Grace, TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim"));
        return _factory.CreateSignedInClient("sarah-kim");
    }

    private async Task<List<Domain.Listings.Listing>> ListingsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Listings.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
    }
}
