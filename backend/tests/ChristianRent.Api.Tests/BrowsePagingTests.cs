// Acceptance Test
// Traces to: L2-006, L2-027, L2-030
// Description: GET /api/listings returns at most one page, by a keyset cursor, and refuses a page size above 50.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

public sealed class BrowsePagingTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-006 criteria 1 and 2; L2-030 criterion 3: 24 a page, then the rest, each listing once,
    // even when several were approved at the same moment; the last page has no next cursor.
    [Fact]
    public async Task Pages_follow_each_other_by_cursor_without_repeating_a_listing()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        var listings = Enumerable.Range(0, 30)
            .Select(i => TestData.ForRent(dan, $"Listing {i:00}", TestData.At(1 + (i / 3))))
            .ToList();
        await _factory.SeedAsync([TestData.Grace, dan, .. listings]);
        using var client = _factory.CreateHttpsClient();

        var first = await GetPageAsync(client, "/api/listings");
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await GetPageAsync(client, $"/api/listings?cursor={cursor}");

        Assert.Equal(24, first.GetProperty("items").GetArrayLength());
        Assert.NotNull(cursor);
        Assert.Equal(6, second.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        var expected = listings
            .OrderByDescending(listing => listing.ApprovedAt)
            .ThenByDescending(listing => listing.Id)
            .Select(listing => listing.Id);
        var received = first.GetProperty("items").EnumerateArray()
            .Concat(second.GetProperty("items").EnumerateArray())
            .Select(item => item.GetProperty("id").GetGuid());
        Assert.Equal(expected, received);
        Assert.Equal(30, second.GetProperty("counts").GetProperty("everything").GetInt32());
    }

    [Fact]
    public async Task A_smaller_page_can_be_asked_for()
    {
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
        await _factory.SeedAsync(
            TestData.Grace, dan,
            TestData.ForRent(dan, "Hall", TestData.At(1)),
            TestData.ForRent(dan, "Room", TestData.At(2)),
            TestData.Wanted(dan, "Van", TestData.At(3)));
        using var client = _factory.CreateHttpsClient();

        var page = await GetPageAsync(client, "/api/listings?size=2");

        Assert.Equal(2, page.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.String, page.GetProperty("nextCursor").ValueKind);
    }

    // L2-030 criterion 3: a page size from 1 to 50, one case per row.
    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(50, true)]
    [InlineData(51, false)]
    [InlineData(1000, false)]
    public async Task A_page_size_outside_1_to_50_is_refused(int size, bool allowed)
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/listings?size={size}", TestContext.Current.CancellationToken);

        if (allowed)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        else
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("page_size_out_of_range", (await Problem.ReadAsync(response)).Code);
        }
    }

    [Theory]
    [InlineData("not-a-cursor!")]
    [InlineData("bm90LWEtY3Vyc29y")]
    public async Task A_cursor_that_does_not_decode_is_refused(string cursor)
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync($"/api/listings?cursor={Uri.EscapeDataString(cursor)}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("cursor_invalid", (await Problem.ReadAsync(response)).Code);
    }

    // L2-027 criterion 3: browsing counts against the 120 reads a minute.
    [Fact]
    public async Task Browsing_is_limited_to_120_reads_a_minute()
    {
        using var client = _factory.CreateHttpsClient();
        for (var i = 0; i < 120; i++)
        {
            using var allowed = await client.GetAsync("/api/listings?size=1", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        using var refused = await client.GetAsync("/api/listings?size=1", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal("rate_limited", (await Problem.ReadAsync(refused)).Code);
    }

    private static async Task<JsonElement> GetPageAsync(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
