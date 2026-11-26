// Acceptance Test
// Traces to: L2-021, L2-026
// Description: A report's reason is one of the fixed list and its note at most 500 characters, as ADR 0023 cleans it; the reason words, one case per row.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Reports;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class ReportListingValidationTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    // L2-021 criterion 1: the fixed list, one case per row; the words are exact.
    [Theory]
    [InlineData("fake", ReportReason.NotARealListing)]
    [InlineData("inappropriate", ReportReason.Inappropriate)]
    [InlineData("scam", ReportReason.Scam)]
    [InlineData("other", ReportReason.SomethingElse)]
    [InlineData("Scam", null)]
    [InlineData("2", null)]
    [InlineData("spam", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void A_reason_is_one_of_the_four_words(string? word, ReportReason? reason)
    {
        Assert.Equal(reason, ReportWords.ReasonOf(word));
    }

    // L2-021 criteria 1 and 7; L2-026 criterion 2: a missing or unknown reason, a note past 500
    // characters or one with a control character is refused, and nothing is stored.
    [Theory]
    [InlineData("no reason", "reason")]
    [InlineData("empty reason", "reason")]
    [InlineData("unknown reason", "reason")]
    [InlineData("a note of 501", "note")]
    [InlineData("a control character", "note")]
    public async Task A_report_that_breaks_a_rule_is_refused(string what, string field)
    {
        var hall = await SeedHallAsync();
        using var client = _factory.CreateSignedInClient("sarah-kim");
        object body = what switch
        {
            "no reason" => new { note = "Please look." },
            "empty reason" => new { reason = "" },
            "unknown reason" => new { reason = "spam" },
            "a note of 501" => new { reason = "scam", note = new string('a', 501) },
            _ => new { reason = "scam", note = "A bell \u0007 in the note" },
        };

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall}/reports", body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.True(problem.Body.GetProperty("errors").TryGetProperty(field, out _), $"No error names {field}.");
        Assert.Empty(await ReportsAsync());
    }

    // L2-021 criterion 1; ADR 0023: the note is optional, is stored trimmed with its line breaks
    // as written, is null when empty, and may be 500 characters as cleaned. A note of HTML is
    // kept as text (L2-026 criterion 1).
    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("  \r\n  ", null)]
    [InlineData("  <b>Pay first</b>\r\nthen see it.  ", "<b>Pay first</b>\nthen see it.")]
    [InlineData("Café", "Café")]
    public async Task A_note_is_stored_as_it_is_cleaned(string? note, string? stored)
    {
        var hall = await SeedHallAsync();
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall}/reports", new { reason = "other", note }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(stored, Assert.Single(await ReportsAsync()).Note);
    }

    [Fact]
    public async Task A_note_of_500_characters_as_cleaned_is_accepted()
    {
        var hall = await SeedHallAsync();
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{hall}/reports", new { reason = "fake", note = $"  {new string('a', 500)}  " }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(500, Assert.Single(await ReportsAsync()).Note!.Length);
    }

    private async Task<Guid> SeedHallAsync()
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        return hall.Id;
    }

    private async Task<List<Report>> ReportsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Reports.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
    }
}
