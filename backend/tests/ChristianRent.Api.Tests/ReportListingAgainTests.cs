// Acceptance Test
// Traces to: L2-021, L2-025
// Description: A second report by the same member is answered 409 already_reported with the date of the first and creates nothing, two sends at once included; the Listing read tells only the reporter that they reported it.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class ReportListingAgainTests : IDisposable
{
    private readonly RacingApiFactory _factory = new();
    private readonly Member _dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace, signInId: "sarah-kim");
    private readonly Member _josh = TestData.Member("Josh Patel", TestData.Grace, signInId: "josh-patel");
    private readonly Listing _hall;

    public ReportListingAgainTests() => _hall = TestData.ForRent(_dan, "Hall", TestData.At(5));

    public void Dispose() => _factory.Dispose();

    // L2-021 criterion 3 and 8: a second report, days later and with another reason, creates
    // nothing and says when the first was filed.
    [Fact]
    public async Task A_second_report_creates_nothing_and_says_when_the_first_was_filed()
    {
        await SeedAsync();
        using var client = _factory.CreateSignedInClient("sarah-kim");
        var first = _factory.Clock.GetUtcNow();
        using var filed = await ReportAsync(client, "scam");
        Assert.Equal(HttpStatusCode.Created, filed.StatusCode);
        _factory.Clock.Advance(TimeSpan.FromDays(3));

        using var again = await ReportAsync(client, "other");

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        var problem = await Problem.ReadAsync(again);
        Assert.Equal("already_reported", problem.Code);
        Assert.Equal(first, problem.Body.GetProperty("reportedAt").GetDateTimeOffset());
        Assert.Equal((1, 1), await CountsAsync());
    }

    // L2-021 criterion 3: the rule is one report for each member and listing; another member's
    // report of the same listing is filed.
    [Fact]
    public async Task Another_member_may_report_the_same_listing()
    {
        await SeedAsync();
        using var sarah = _factory.CreateSignedInClient("sarah-kim");
        using var josh = _factory.CreateSignedInClient("josh-patel");
        using var first = await ReportAsync(sarah, "scam");

        using var second = await ReportAsync(josh, "fake");

        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        Assert.Equal((2, 2), await CountsAsync());
    }

    // L2-021 criterion 3; ADR 0023: when another report by the member arrives while this one is
    // saved, the unique index refuses the save, and the answer is already_reported.
    [Fact]
    public async Task Two_reports_sent_at_once_are_answered_as_a_second_report()
    {
        await SeedAsync();
        var other = TestData.At(8, 12);
        _factory.BeforeSave = async database =>
        {
            database.Reports.Add(Report.File(_hall, _sarah.Id, ReportReason.Scam, null, other));
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
            throw new DbUpdateException("The unique index refused the row.");
        };
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await ReportAsync(client, "scam");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("already_reported", problem.Code);
        Assert.Equal(other, problem.Body.GetProperty("reportedAt").GetDateTimeOffset());
    }

    // Any other failure to save is an unexpected error, not a second report.
    [Fact]
    public async Task A_report_that_cannot_be_saved_is_not_taken_for_a_second_one()
    {
        await SeedAsync();
        _factory.BeforeSave = _ => throw new DbUpdateException("The database is gone.");
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await ReportAsync(client, "scam");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("unexpected", (await Problem.ReadAsync(response)).Code);
    }

    // L2-021 criteria 4 and 8; ADR 0023: the Listing read tells the member who reported when they
    // did; everyone else, the member who posted included, is told nothing.
    [Theory]
    [InlineData("sarah-kim", true)]
    [InlineData("josh-patel", false)]
    [InlineData("dan-whitaker", false)]
    [InlineData("member-of-nothing", false)]
    [InlineData(null, false)]
    public async Task Only_the_reporter_is_told_that_they_reported_the_listing(string? reader, bool told)
    {
        await SeedAsync();
        var first = _factory.Clock.GetUtcNow();
        using var sarah = _factory.CreateSignedInClient("sarah-kim");
        using var filed = await ReportAsync(sarah, "scam");
        _factory.Clock.Advance(TimeSpan.FromHours(1));
        using var client = reader is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(reader);

        var listing = await client.GetFromJsonAsync<JsonElement>($"/api/listings/{_hall.Id}", TestContext.Current.CancellationToken);

        var reportedAt = listing.GetProperty("reportedAt");
        if (told)
        {
            Assert.Equal(first, reportedAt.GetDateTimeOffset());
        }
        else
        {
            Assert.Equal(JsonValueKind.Null, reportedAt.ValueKind);
        }
    }

    private Task SeedAsync() => _factory.SeedAsync(TestData.Grace, _dan, _sarah, _josh, _hall);

    private Task<HttpResponseMessage> ReportAsync(HttpClient client, string reason) =>
        client.PostAsJsonAsync($"/api/listings/{_hall.Id}/reports", new { reason }, TestContext.Current.CancellationToken);

    private async Task<(int Reports, int ReviewItems)> CountsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            await database.Reports.CountAsync(TestContext.Current.CancellationToken),
            await database.ReviewItems.CountAsync(TestContext.Current.CancellationToken));
    }

    /// <summary>
    /// The API whose handlers reach the database through an <see cref="IAppDbContext"/> that runs
    /// <see cref="BeforeSave"/> before it saves, so a test injects a fault there (ADR 0007).
    /// </summary>
    private sealed class RacingApiFactory : ProbeApiFactory
    {
        public Func<AppDbContext, Task>? BeforeSave { get; set; }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            services.AddScoped<IAppDbContext>(provider => new RacingDbContext(provider, this));
        }

        private sealed class RacingDbContext(IServiceProvider services, RacingApiFactory factory) : IAppDbContext
        {
            private AppDbContext Inner => services.GetRequiredService<AppDbContext>();

            public DbSet<Church> Churches => Inner.Churches;

            public DbSet<Member> Members => Inner.Members;

            public DbSet<Listing> Listings => Inner.Listings;

            public DbSet<Photo> Photos => Inner.Photos;

            public DbSet<Message> Messages => Inner.Messages;

            public DbSet<Report> Reports => Inner.Reports;

            public DbSet<ReviewItem> ReviewItems => Inner.ReviewItems;

            public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
            {
                if (factory.BeforeSave is { } fault)
                {
                    // The competing writer has its own unit of work.
                    using var scope = factory.Services.CreateScope();
                    await fault(scope.ServiceProvider.GetRequiredService<AppDbContext>());
                }

                return await Inner.SaveChangesAsync(cancellationToken);
            }

            public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => Inner.CanConnectAsync(cancellationToken);
        }
    }
}
