// Unit Test
// Traces to: L2-018, L2-020
// Description: DecideReviewItemCommandHandler's decision table, one case per row: what each decision does to the listing, the report, the member and the notices.
using System.Security.Claims;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Review;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class DecisionTableTests : IDisposable
{
    private readonly ApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace);
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false);
    private readonly Guid _naomi = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    /// <summary>What stands after a decision: the subject of its row, and the notices recorded.</summary>
    public sealed record Outcome(ListingStatus? Listing, ReportStatus? Report, bool? MemberVerified, MemberStatus? MemberStatus, int Notices);

    [Theory]
    [InlineData(ReviewItemKind.NewListing, "approve", ListingStatus.Approved, null, null, null, 0)]
    [InlineData(ReviewItemKind.NewListing, "remove", ListingStatus.Removed, null, null, null, 1)]
    [InlineData(ReviewItemKind.Report, "keep", ListingStatus.Approved, ReportStatus.Closed, null, null, 0)]
    [InlineData(ReviewItemKind.Report, "remove", ListingStatus.Removed, ReportStatus.Closed, null, null, 1)]
    public async Task Each_row_of_the_table_has_its_effect(
        ReviewItemKind kind,
        string decision,
        ListingStatus? listing,
        ReportStatus? report,
        bool? memberVerified,
        MemberStatus? memberStatus,
        int notices)
    {
        var garden = TestData.ForRent(_dan, "Backyard garden for gatherings", kind == ReviewItemKind.NewListing ? null : TestData.At(5));
        var reported = Report.File(garden, _sarah.Id, ReportReason.Scam, null, TestData.At(6));
        var item = kind switch
        {
            ReviewItemKind.NewListing => ReviewItem.ForNewListing(garden.Id, TestData.At(7)),
            ReviewItemKind.Report => ReviewItem.ForReport(reported.Id, TestData.At(7)),
            _ => ReviewItem.ForNewMember(_alicia.Id, TestData.At(7)),
        };
        object[] subject = kind switch
        {
            ReviewItemKind.NewListing => [garden],
            ReviewItemKind.Report => [garden, reported],
            _ => [],
        };
        await _factory.SeedAsync([TestData.Grace, TestData.StPauls, _dan, _sarah, _alicia, item, .. subject]);

        var closed = await DecideAsync(item.Id, decision);

        Assert.Equal([item.Id], closed.ClosedItemIds);
        var outcome = await StoredAsync(async database => new Outcome(
            (await database.Listings.SingleOrDefaultAsync(found => found.Id == garden.Id))?.Status,
            (await database.Reports.SingleOrDefaultAsync(found => found.Id == reported.Id))?.Status,
            kind == ReviewItemKind.NewMember ? (await database.Members.SingleAsync(found => found.Id == _alicia.Id)).IsVerified : null,
            kind == ReviewItemKind.NewMember ? (await database.Members.SingleAsync(found => found.Id == _alicia.Id)).Status : null,
            await database.ListingRemovalNotices.CountAsync()));
        Assert.Equal(new Outcome(listing, report, memberVerified, memberStatus, notices), outcome);
        var record = await StoredAsync(database => database.ReviewItems.SingleAsync(found => found.Id == item.Id));
        Assert.Equal(_naomi, record.DecidedBy);
        Assert.Equal(_factory.Clock.GetUtcNow(), record.DecidedAt);
        Assert.Equal(decision, ReviewWords.Of(record.Decision!.Value));
    }

    /// <summary>Sends the command as the admin Naomi, straight to its handler.</summary>
    private async Task<DecidedDto> DecideAsync(Guid itemId, string decision)
    {
        using var scope = _factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("member_id", _naomi.ToString()), new Claim(ClaimTypes.Role, "admin")], "Test")),
        };
        return await scope.ServiceProvider.GetRequiredService<ISender>()
            .Send(new DecideReviewItemCommand(itemId.ToString(), decision, 0), TestContext.Current.CancellationToken);
    }

    private async Task<T> StoredAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = _factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
