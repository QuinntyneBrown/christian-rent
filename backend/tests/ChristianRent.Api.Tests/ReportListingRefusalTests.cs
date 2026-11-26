// Acceptance Test
// Traces to: L2-021, L2-025
// Description: A report is refused for someone who is not a member, about a listing that is not public (revealing nothing) and on one's own listing; nothing is stored.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class ReportListingRefusalTests : IDisposable
{
    private static readonly object Body = new { reason = "scam" };

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    // L2-021 criterion 5; L2-025 criteria 1 and 3: a person who is not a member is refused with
    // not_a_member, and someone not signed in with 401; nothing is stored.
    [Theory]
    [InlineData("member-of-nothing", HttpStatusCode.Forbidden, "not_a_member")]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    public async Task Only_a_member_may_report(string? signInId, HttpStatusCode status, string code)
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, hall);
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/reports", Body, TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        await AssertNothingStoredAsync();
    }

    // L2-021 criterion 11; L2-025 criterion 2: a listing that is not public is answered like one
    // that does not exist, to another member and to its own poster alike.
    [Theory]
    [InlineData("waiting", "sarah-kim")]
    [InlineData("removed", "sarah-kim")]
    [InlineData("poster left", "sarah-kim")]
    [InlineData("poster removed", "sarah-kim")]
    [InlineData("unknown", "sarah-kim")]
    [InlineData("not an identifier", "sarah-kim")]
    [InlineData("waiting", "dan-whitaker")]
    [InlineData("removed", "dan-whitaker")]
    public async Task A_report_about_a_listing_that_is_not_public_is_answered_not_found(string what, string signInId)
    {
        var hall = TestData.ForRent(_dan, "Hall", what == "waiting" ? null : TestData.At(5));
        var address = hall.Id.ToString();
        switch (what)
        {
            case "removed": hall.Remove(); break;
            case "poster left": _dan.Depart(TestData.At(6)); break;
            case "poster removed": _dan.Remove(); break;
            case "unknown": address = Guid.NewGuid().ToString(); break;
            case "not an identifier": address = "sunlit-hall"; break;
        }

        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient(signInId);

        using var response = await client.PostAsJsonAsync($"/api/listings/{address}/reports", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        await AssertNothingStoredAsync();
    }

    // L2-021 criteria 10 and 11: a report on one's own listing sent straight to the backend is
    // refused.
    [Fact]
    public async Task A_report_on_ones_own_listing_is_refused()
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, hall);
        using var client = _factory.CreateSignedInClient("dan-whitaker");

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/reports", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("own_listing", (await Problem.ReadAsync(response)).Code);
        await AssertNothingStoredAsync();
    }

    private async Task AssertNothingStoredAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await database.Reports.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await database.ReviewItems.CountAsync(TestContext.Current.CancellationToken));
    }
}
