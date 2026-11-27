// Acceptance Test
// Traces to: L2-020, L2-025
// Description: What POST /api/admin/review-queue/{id}/decision refuses: anyone but an admin, a second decision, a pair the table does not allow, an item that no longer waits, and a stale version.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class DecisionRefusalTests : IDisposable
{
    private readonly RacingApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
    private readonly Member _marcus = TestData.Member("Marcus Lee", TestData.NewSong);
    private readonly Guid _naomi = Guid.NewGuid();
    private readonly Guid _peter = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    // L2-020 criterion 3, L2-025 criteria 1 and 3: only an admin decides.
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("sarah-kim", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("not-a-member", HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Only_an_admin_decides(string? signInId, HttpStatusCode status, string code)
    {
        var item = await SeedNewListingAsync();
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId, session: "admin");

        using var response = await DecideAsync(client, item.Id, "approve");

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        Assert.Null((await ItemAsync(item.Id)).Decision);
    }

    // L2-020 criteria 5, 13 and 17: a second decision is refused with the first one, its time and
    // whether it was the caller's, naming no admin; the first stands.
    [Theory]
    [InlineData(false, "approve")]
    [InlineData(false, "remove")]
    [InlineData(true, "remove")]
    public async Task A_second_decision_is_refused_and_the_first_stands(bool sameAdmin, string second)
    {
        var item = await SeedNewListingAsync();
        var firstAt = _factory.Clock.GetUtcNow();
        using var naomi = Admin(_naomi);
        using var first = await DecideAsync(naomi, item.Id, "approve");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        _factory.Clock.Advance(TimeSpan.FromMinutes(3));
        using var other = Admin(sameAdmin ? _naomi : _peter);

        using var response = await DecideAsync(other, item.Id, second);

        await AssertAlreadyDecidedAsync(response, "approve", firstAt, sameAdmin);
        var stored = await ItemAsync(item.Id);
        Assert.Equal(
            (ReviewDecision.Approve, _naomi, firstAt, 1),
            (stored.Decision!.Value, stored.DecidedBy!.Value, stored.DecidedAt!.Value, stored.Version));
    }

    // L2-020 criterion 17: the same admin sending the same decision again, as "Try again" does,
    // is answered as made, with the same items, and nothing changes.
    [Fact]
    public async Task The_same_admin_repeating_a_decision_is_answered_as_made()
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", TestData.At(5));
        var first = Report.File(hall, _sarah.Id, ReportReason.Scam, null, TestData.At(6));
        var second = Report.File(hall, _marcus.Id, ReportReason.Scam, null, TestData.At(7));
        var firstItem = ReviewItem.ForReport(first.Id, TestData.At(6));
        var secondItem = ReviewItem.ForReport(second.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.Grace, TestData.NewSong, _dan, _sarah, _marcus, hall, first, second, firstItem, secondItem);
        using var naomi = Admin(_naomi);
        var decidedAt = _factory.Clock.GetUtcNow();
        using var made = await DecideAsync(naomi, firstItem.Id, "remove");
        var closed = await ClosedAsync(made);
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));

        using var again = await DecideAsync(naomi, firstItem.Id, "remove");

        Assert.Equal(closed.Order(), (await ClosedAsync(again)).Order());
        Assert.Equal(2, closed.Count);
        Assert.Equal(decidedAt, (await ItemAsync(firstItem.Id)).DecidedAt);
        Assert.Equal(1, await StoredAsync(database => database.ListingRemovalNotices.CountAsync()));
    }

    // L2-020 criterion 5, ADR 0026: of two decisions that arrive together, the one that saves
    // second is answered as a second decision; the concurrency token catches it.
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task A_decision_that_loses_the_race_is_answered_like_a_second_one(bool sameAdmin)
    {
        var item = await SeedNewListingAsync();
        var theirTime = _factory.Clock.GetUtcNow().AddSeconds(-1);
        var theirAdmin = sameAdmin ? _naomi : _peter;
        _factory.BeforeSave = async competing =>
        {
            var theirs = await competing.ReviewItems.SingleAsync(found => found.Id == item.Id);
            theirs.Decide(ReviewDecision.Approve, theirAdmin, theirTime);
            await competing.SaveChangesAsync(TestContext.Current.CancellationToken);
        };
        using var naomi = Admin(_naomi);

        using var response = await DecideAsync(naomi, item.Id, "approve");

        if (sameAdmin)
        {
            Assert.Equal([item.Id], await ClosedAsync(response));
        }
        else
        {
            await AssertAlreadyDecidedAsync(response, "approve", theirTime, byYou: false);
        }

        var stored = await ItemAsync(item.Id);
        Assert.Equal((theirAdmin, theirTime), (stored.DecidedBy!.Value, stored.DecidedAt!.Value));
    }

    // L2-020 criterion 19: a pair the table does not allow changes nothing.
    [Theory]
    [InlineData(ReviewItemKind.NewListing, "keep")]
    [InlineData(ReviewItemKind.Report, "approve")]
    [InlineData(ReviewItemKind.NewMember, "keep")]
    public async Task A_decision_the_kind_does_not_take_is_refused(ReviewItemKind kind, string decision)
    {
        var hall = TestData.ForRent(_dan, "Sunlit fellowship hall for 80", kind == ReviewItemKind.NewListing ? null : TestData.At(5));
        var report = Report.File(hall, _sarah.Id, ReportReason.Scam, null, TestData.At(6));
        var item = kind switch
        {
            ReviewItemKind.NewListing => ReviewItem.ForNewListing(hall.Id, TestData.At(7)),
            ReviewItemKind.Report => ReviewItem.ForReport(report.Id, TestData.At(7)),
            _ => ReviewItem.ForNewMember(_sarah.Id, TestData.At(7)),
        };
        object[] reports = kind == ReviewItemKind.Report ? [report] : [];
        await _factory.SeedAsync([TestData.Grace, _dan, _sarah, hall, item, .. reports]);
        using var naomi = Admin(_naomi);

        using var response = await DecideAsync(naomi, item.Id, decision);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("decision_not_allowed", (await Problem.ReadAsync(response)).Code);
        Assert.Null((await ItemAsync(item.Id)).Decision);
    }

    [Theory]
    [InlineData("9f0d7c9e-1111-4222-8333-000000000000")]
    [InlineData("not-an-identifier")]
    public async Task An_unknown_item_is_not_found(string id)
    {
        using var naomi = Admin(_naomi);

        using var response = await naomi.PostAsJsonAsync(
            $"/api/admin/review-queue/{id}/decision", new { decision = "approve", version = 0 }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
    }

    // L2-020 criterion 18: an item nobody decided that no longer waits is not found.
    [Fact]
    public async Task An_item_that_no_longer_waits_is_not_found_and_stays_undecided()
    {
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(garden.Id, TestData.At(7));
        _dan.Remove();
        await _factory.SeedAsync(TestData.Grace, _dan, garden, item);
        using var naomi = Admin(_naomi);

        using var response = await DecideAsync(naomi, item.Id, "approve");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        Assert.Null((await ItemAsync(item.Id)).Decision);
    }

    [Theory]
    [InlineData("approve", 7, "version_unknown")]
    [InlineData("delete", 0, "validation_failed")]
    [InlineData(null, 0, "validation_failed")]
    public async Task A_request_that_makes_no_sense_is_refused(string? decision, int version, string code)
    {
        var item = await SeedNewListingAsync();
        using var naomi = Admin(_naomi);

        using var response = await naomi.PostAsJsonAsync(
            $"/api/admin/review-queue/{item.Id}/decision", new { decision, version }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        Assert.Null((await ItemAsync(item.Id)).Decision);
    }

    private HttpClient Admin(Guid id) => _factory.CreateMemberClient(id, admin: true);

    private async Task<ReviewItem> SeedNewListingAsync()
    {
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", approvedAt: null);
        var item = ReviewItem.ForNewListing(garden.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.Grace, _dan, _sarah, garden, item);
        return item;
    }

    private static Task<HttpResponseMessage> DecideAsync(HttpClient client, Guid id, string decision) =>
        client.PostAsJsonAsync($"/api/admin/review-queue/{id}/decision", new { decision, version = 0 }, TestContext.Current.CancellationToken);

    private static async Task<List<Guid>> ClosedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return answer.GetProperty("closedItemIds").EnumerateArray().Select(value => value.GetGuid()).ToList();
    }

    private async Task AssertAlreadyDecidedAsync(HttpResponseMessage response, string decision, DateTimeOffset decidedAt, bool byYou)
    {
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var problem = JsonDocument.Parse(text);
        var root = problem.RootElement;
        Assert.Equal("already_decided", root.GetProperty("code").GetString());
        Assert.Equal(decision, root.GetProperty("decision").GetString());
        Assert.Equal(decidedAt, root.GetProperty("decidedAt").GetDateTimeOffset());
        Assert.Equal(byYou, root.GetProperty("decidedByYou").GetBoolean());
        Assert.DoesNotContain(_naomi.ToString(), text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(_peter.ToString(), text, StringComparison.OrdinalIgnoreCase);
    }

    private Task<ReviewItem> ItemAsync(Guid id) => StoredAsync(database => database.ReviewItems.SingleAsync(item => item.Id == id));

    private async Task<T> StoredAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = _factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
