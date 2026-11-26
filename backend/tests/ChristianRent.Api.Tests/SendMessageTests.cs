// Acceptance Test
// Traces to: L2-015, L2-016, L2-024, L2-025
// Description: POST /api/listings/{listingId}/messages stores a member's message for the sender and the person who posted, with its dates, changes nothing on the listing, and answers no text.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class SendMessageTests : IDisposable
{
    internal const string Text = "Hi Dan, is the hall free on the dates below? We’re planning a baby shower for about 40 people.";

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim", isVerified: false);

    public void Dispose() => _factory.Dispose();

    // L2-015 criterion 1; L2-016 criterion 1; L2-024 criterion 3: a message of a member about an
    // approved listing for rent is stored with its dates for the sender and the person who
    // posted; the answer names it without its text, and the listing is as it was.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_member_sends_a_message_with_dates_to_the_person_who_posted()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{hall.Id}/messages",
            new { text = Text, startDate = "2026-06-13", endDate = "2026-06-13" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sent = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(_factory.Clock.GetUtcNow(), sent.GetProperty("sentAt").GetDateTimeOffset());
        Assert.Equal(["id", "sentAt"], sent.EnumerateObject().Select(property => property.Name).Order());

        var message = Assert.Single(await MessagesAsync());
        Assert.Equal(sent.GetProperty("id").GetGuid(), message.Id);
        Assert.Equal(hall.Id, message.ListingId);
        Assert.Equal(_sarah.Id, message.SenderId);
        Assert.Equal(_dan.Id, message.RecipientId);
        Assert.Equal(Text, message.Text);
        Assert.Equal(new DateOnly(2026, 6, 13), message.StartDate);
        Assert.Equal(new DateOnly(2026, 6, 13), message.EndDate);
        Assert.Equal(_factory.Clock.GetUtcNow(), message.SentAt);

        // Nothing is reserved: the listing still reads as it did.
        using var anyone = _factory.CreateHttpsClient();
        var listing = await anyone.GetFromJsonAsync<JsonElement>($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("Weekdays and Saturdays", listing.GetProperty("when").GetProperty("text").GetString());
        var stored = await ListingAsync(hall.Id);
        Assert.Equal(ListingStatus.Approved, stored.Status);
        Assert.Null(stored.StartDate);
    }

    // L2-015 criterion 2: a message about a wanted listing has no dates.
    [Fact]
    public async Task A_member_offers_to_help_with_a_wanted_listing_without_dates()
    {
        var van = TestData.Wanted(_dan, "15-passenger van for youth camp", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, van);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            $"/api/listings/{van.Id}/messages", new { text = "I think I can help with this." }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var message = Assert.Single(await MessagesAsync());
        Assert.Null(message.StartDate);
        Assert.Null(message.EndDate);
        Assert.Equal(_dan.Id, message.RecipientId);
    }

    // L2-016 criterion 1: Message's own rule, one case per row: only the sender and the person
    // who posted may read it.
    [Theory]
    [InlineData("sender", true)]
    [InlineData("recipient", true)]
    [InlineData("someone else", false)]
    [InlineData("nobody", false)]
    public void Only_the_sender_and_the_recipient_can_read_a_message(string reader, bool canRead)
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        var message = Message.Send(hall, _sarah.Id, Text, null, null, TestData.At(8));
        Guid readerId = reader switch
        {
            "sender" => _sarah.Id,
            "recipient" => _dan.Id,
            "someone else" => Guid.NewGuid(),
            _ => Guid.Empty,
        };

        Assert.Equal(canRead, message.CanBeReadBy(readerId));
    }

    private async Task<List<Message>> MessagesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Messages.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
    }

    private async Task<Listing> ListingAsync(Guid id)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Listings.AsNoTracking()
            .SingleAsync(listing => listing.Id == id, TestContext.Current.CancellationToken);
    }
}
