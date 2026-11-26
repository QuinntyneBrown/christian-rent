// Acceptance Test
// Traces to: L2-015, L2-016, L2-025
// Description: A message is refused for someone who is not a member, on one's own listing, about a listing that is not public (revealing nothing), and past 20 messages in an hour with the time sending reopens; MessagingLimit's rule, one case per row.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class SendMessageRefusalTests : IDisposable
{
    private static readonly object Body = new { text = "Is the hall free?" };

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");

    public void Dispose() => _factory.Dispose();

    private DateTimeOffset Now => _factory.Clock.GetUtcNow();

    // L2-015 criterion 5; L2-025 criteria 1 and 3: a person who is not a member is refused with
    // not_a_member, and someone not signed in with 401; nothing is stored.
    [Theory]
    [InlineData("member-of-nothing", HttpStatusCode.Forbidden, "not_a_member")]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    public async Task Only_a_member_may_send_a_message(string? signInId, HttpStatusCode status, string code)
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, hall);
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        Assert.Equal(0, await CountAsync());
    }

    // L2-015 criterion 6: a message sent straight to the backend about one's own listing is refused.
    [Fact]
    public async Task A_message_about_ones_own_listing_is_refused()
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        await _factory.SeedAsync(TestData.Grace, _dan, hall);
        using var client = _factory.CreateSignedInClient("dan-whitaker");

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("own_listing", (await Problem.ReadAsync(response)).Code);
        Assert.Equal(0, await CountAsync());
    }

    // L2-016 criterion 5; L2-025 criterion 2; ADR 0022: a listing that is not public is answered
    // like one that does not exist, to another member, to its own poster and to an admin alike.
    [Theory]
    [InlineData("waiting", "sarah-kim")]
    [InlineData("removed", "sarah-kim")]
    [InlineData("poster left", "sarah-kim")]
    [InlineData("poster removed", "sarah-kim")]
    [InlineData("unknown", "sarah-kim")]
    [InlineData("not an identifier", "sarah-kim")]
    [InlineData("waiting", "dan-whitaker")]
    [InlineData("removed", "dan-whitaker")]
    public async Task A_message_about_a_listing_that_is_not_public_is_answered_not_found(string what, string signInId)
    {
        var hall = TestData.ForRent(_dan, "Hall", what == "waiting" ? null : TestData.At(5));
        var address = hall.Id.ToString();
        switch (what)
        {
            case "removed": hall.Remove(); break;
            case "poster left": _dan.Depart(TestData.At(6)); break;
            case "poster removed": _dan.Remove(); break;
            case "unknown": address = Guid.NewGuid().ToString(); break;
            case "not an identifier": address = "the-hall"; break;
        }

        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, hall);
        using var client = _factory.CreateSignedInClient(signInId);

        using var response = await client.PostAsJsonAsync($"/api/listings/{address}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        Assert.Equal(0, await CountAsync());
    }

    // An admin has no way round it either: a waiting listing takes no message.
    [Fact]
    public async Task An_admin_cannot_send_a_message_about_a_waiting_listing()
    {
        var hall = TestData.ForRent(_dan, "Hall", approvedAt: null);
        await _factory.SeedAsync(TestData.Grace, _dan, hall);
        using var client = _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, await CountAsync());
    }

    // L2-016 criteria 4 and 6: with 20 messages sent in the last hour, the next is refused with
    // 429, message_limit_reached and when sending reopens; nothing is stored.
    [Fact]
    public async Task A_twenty_first_message_in_an_hour_is_refused_with_the_time_sending_reopens()
    {
        var hall = await SeedWithSentAsync(Enumerable.Range(0, 20).Select(index => Now.AddMinutes(-40 + index)));
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("message_limit_reached", problem.Code);
        Assert.Equal(Now.AddMinutes(20), problem.Body.GetProperty("retryAt").GetDateTimeOffset());
        Assert.Equal(20, await CountAsync());
    }

    // Once the oldest of the twenty is an hour old, the member may send again.
    [Fact]
    public async Task Sending_reopens_once_the_oldest_of_the_twenty_is_an_hour_old()
    {
        var hall = await SeedWithSentAsync(Enumerable.Range(0, 20).Select(index => Now.AddMinutes(-40 + index)));
        using var client = _factory.CreateSignedInClient("sarah-kim");
        _factory.Clock.Advance(TimeSpan.FromMinutes(20));

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(21, await CountAsync());
    }

    // The limit is each member's own: another member's messages do not count.
    [Fact]
    public async Task Another_members_messages_do_not_count()
    {
        var hall = await SeedWithSentAsync(Enumerable.Range(0, 20).Select(index => Now.AddMinutes(-40 + index)));
        var josh = TestData.Member("Josh Patel", TestData.Grace, signInId: "josh-patel");
        await _factory.SeedAsync(josh);
        using var client = _factory.CreateSignedInClient("josh-patel");

        using var response = await client.PostAsJsonAsync($"/api/listings/{hall.Id}/messages", Body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // The rule of MessagingLimit (send-message design; ADR 0022), one case per row: the minutes
    // ago at which the member's messages were sent, and when sending reopens, in minutes from
    // now, or null when it is open.
    [Theory]
    [InlineData(19, 1, 0, null)]
    [InlineData(20, 1, 0, 59)]
    [InlineData(20, 0, 0, 60)]
    [InlineData(20, 41, 0, 19)]
    [InlineData(19, 1, 60, null)]
    [InlineData(21, 1, 0, 59)]
    [InlineData(19, 1, 59, 1)]
    [InlineData(0, 0, 0, null)]
    public void MessagingLimit_says_when_sending_reopens(int recent, int minutesAgo, int oneMoreMinutesAgo, int? reopensInMinutes)
    {
        var now = new DateTimeOffset(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);
        var sentAt = Enumerable.Repeat(now.AddMinutes(-minutesAgo), recent).ToList();
        if (oneMoreMinutesAgo > 0)
        {
            sentAt.Add(now.AddMinutes(-oneMoreMinutesAgo));
        }

        var retryAt = MessagingLimit.RetryAt(sentAt, now);

        Assert.Equal(reopensInMinutes is { } minutes ? now.AddMinutes(minutes) : null, retryAt);
    }

    private async Task<Listing> SeedWithSentAsync(IEnumerable<DateTimeOffset> sentAt)
    {
        var hall = TestData.ForRent(_dan, "Hall", TestData.At(5));
        var sent = sentAt.Select(at => Message.Send(hall, _sarah.Id, "Earlier", null, null, at));
        await _factory.SeedAsync([TestData.Grace, _dan, _sarah, hall, .. sent]);
        return hall;
    }

    private async Task<int> CountAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Messages
            .CountAsync(TestContext.Current.CancellationToken);
    }
}
