// Acceptance Test
// Traces to: L2-015, L2-026
// Description: A message is refused with validation_failed unless its text is 1 to 1,000 characters and its dates, when given, are both there, in order and not in the past; a wanted listing takes no dates; what a member writes is kept as text.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Messages;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class SendMessageValidationTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    // The rules of SendMessageCommandValidator (send-message design; ADR 0022), one case per
    // row, on Jun 8, 2026 at 15:00 UTC: the text, the dates, and the field that is refused.
    [Theory]
    [InlineData("Hi", null, null, null)]
    [InlineData("  Hi  ", null, null, null)]
    [InlineData("Line one\r\n\tLine two", null, null, null)]
    [InlineData("", null, null, "Text")]
    [InlineData(" \n ", null, null, "Text")]
    [InlineData(null, null, null, "Text")]
    [InlineData("Bell\u0007", null, null, "Text")]
    [InlineData("Hi", "2026-06-08", "2026-06-08", null)]
    [InlineData("Hi", "2026-06-13", "2026-06-15", null)]
    [InlineData("Hi", "2026-06-07", "2026-06-08", null)]
    [InlineData("Hi", "2026-06-06", "2026-06-08", "StartDate")]
    [InlineData("Hi", "2026-06-13", "2026-06-12", "EndDate")]
    [InlineData("Hi", "2026-06-13", null, "EndDate")]
    [InlineData("Hi", null, "2026-06-13", "StartDate")]
    public void The_validator_checks_the_text_and_the_dates(string? text, string? start, string? end, string? refused)
    {
        var validator = new SendMessageCommandValidator(_factory.Clock);

        var result = validator.Validate(new SendMessageCommand(Guid.NewGuid().ToString(), text, Date(start), Date(end)));

        Assert.Equal(refused is null ? [] : [refused], result.Errors.Select(failure => failure.PropertyName).Distinct());
    }

    // L2-015 criterion 4: the text is counted as it is stored, trimmed: 1,000 is sent, 1,001 is not.
    [Theory]
    [InlineData(1000, true)]
    [InlineData(1001, false)]
    public void A_message_is_at_most_1000_characters(int length, bool valid)
    {
        var validator = new SendMessageCommandValidator(_factory.Clock);

        var result = validator.Validate(new SendMessageCommand(Guid.NewGuid().ToString(), $"  {new string('a', length)}  ", null, null));

        Assert.Equal(valid, result.IsValid);
    }

    // L2-015 criteria 3 and 4, straight to the backend: an empty message with dates out of
    // order is refused naming both fields, and nothing is stored.
    [Fact]
    public async Task An_empty_message_with_dates_out_of_order_is_refused_naming_both()
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{hall.Id}/messages",
            new { text = " ", startDate = "2026-06-13", endDate = "2026-06-12" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        var errors = problem.Body.GetProperty("errors");
        Assert.Equal("Write a message of 1 to 1,000 characters.", errors.GetProperty("text")[0].GetString());
        Assert.Equal("The end date is before the start date.", errors.GetProperty("endDate")[0].GetString());
        Assert.Empty(await MessagesAsync());
    }

    // L2-015 criterion 2; ADR 0022: a wanted listing takes no dates.
    [Fact]
    public async Task Dates_on_a_message_about_a_wanted_listing_are_refused()
    {
        var van = TestData.Wanted(_dan, "15-passenger van for youth camp", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, van);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{van.Id}/messages",
            new { text = "I can help.", startDate = "2026-07-14", endDate = "2026-07-18" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("validation_failed", problem.Code);
        Assert.Equal("A message about a wanted listing has no dates.", problem.Body.GetProperty("errors").GetProperty("startDate")[0].GetString());
        Assert.Empty(await MessagesAsync());
    }

    // L2-026 criteria 1 and 2: HTML in a message is stored as the text it is, trimmed, with its
    // line breaks as \n.
    [Fact]
    public async Task Html_in_a_message_is_kept_as_text()
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{hall.Id}/messages",
            new { text = "\r\n<img src=x onerror=alert(1)>\r\n<script>alert(2)</script>  \n" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("<img src=x onerror=alert(1)>\n<script>alert(2)</script>", Assert.Single(await MessagesAsync()).Text);
    }

    private static DateOnly? Date(string? iso) => iso is null ? null : DateOnly.ParseExact(iso, "yyyy-MM-dd");

    private async Task<List<Message>> MessagesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Messages.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
    }
}
