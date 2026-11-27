using ChristianRent.Application;
using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Members;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Notices;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// L2-028 criterion 2 (handle-member-data design): <c>purge-departed</c> makes a member who left
/// anonymous, and deletes their listings and photo files, once the configured days have passed,
/// at most 30. Time is a fake clock; nothing sleeps.
/// </summary>
public sealed class PurgeDepartedTests : IDisposable
{
    private static readonly DateTimeOffset LeftAt = new(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);
    private static readonly string[] Renditions = ["card", "gallery", "thumb"];

    private readonly FakeTimeProvider _clock = new(LeftAt);
    private readonly MemoryPhotoStorage _photos = new();
    private readonly StringWriter _output = new();
    private readonly string _databaseName = $"christian-rent-purge-{Guid.NewGuid()}";

    private readonly Church _grace = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);
    private readonly Member _dan;
    private readonly Member _ruth;
    private readonly Guid _dansPhoto = Guid.NewGuid();
    private readonly Guid _ruthsPhoto = Guid.NewGuid();

    public PurgeDepartedTests()
    {
        _dan = Member.Create(Guid.NewGuid(), "Pastor Dan Whitaker", _grace.Id, isVerified: true, LeftAt.AddYears(-2), "dan-whitaker");
        _ruth = Member.Create(Guid.NewGuid(), "Ruth and Caleb Moore", _grace.Id, isVerified: true, LeftAt.AddYears(-1), "ruth-moore");
    }

    public void Dispose() => _output.Dispose();

    [Fact]
    public async Task A_departed_member_is_made_anonymous_with_their_listings_and_photos_deleted_after_30_days()
    {
        await SeedAsync();
        using var services = Services(afterDays: null);

        _clock.Advance(TimeSpan.FromDays(30) - TimeSpan.FromMinutes(1));
        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));
        Assert.Contains("Anonymised 0 departed members and deleted 0 listings and 0 photos.", _output.ToString(), StringComparison.Ordinal);
        Assert.Equal("Pastor Dan Whitaker", (await MemberAsync(services, _dan.Id)).Name);

        _clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        Assert.Contains("Anonymised 1 departed members and deleted 1 listings and 1 photos.", _output.ToString(), StringComparison.Ordinal);
        var dan = await MemberAsync(services, _dan.Id);
        Assert.Equal("Former member", dan.Name);
        Assert.Null(dan.SignInId);
        Assert.Equal(_clock.GetUtcNow(), dan.AnonymizedAt);
        using var scope = services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = Assert.Single(await database.Listings.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(_ruth.Id, listing.MemberId);
        Assert.All(Renditions, rendition => Assert.DoesNotContain($"{_dansPhoto:N}/{rendition}.jpg", _photos.Files.Keys));
        Assert.All(Renditions, rendition => Assert.Contains($"{_ruthsPhoto:N}/{rendition}.jpg", _photos.Files.Keys));
        Assert.Equal("Ruth and Caleb Moore", (await MemberAsync(services, _ruth.Id)).Name);
    }

    // L2-016 criterion 7 (ADR 0022): what a departed member wrote in a message goes, and the
    // message keeps its place; the messages about their listings go with those listings; other
    // members' messages stay as they were.
    [Fact]
    public async Task A_departed_members_sent_messages_lose_their_text_and_the_ones_about_their_listings_are_deleted()
    {
        await SeedAsync();
        using var services = Services(afterDays: null);
        var josh = Member.Create(Guid.NewGuid(), "Josh Patel", _grace.Id, isVerified: true, LeftAt.AddYears(-1), "josh-patel");
        Guid fromDan, fromJosh;
        using (var scope = services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var listings = await database.Listings.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
            var dansHall = listings.Single(listing => listing.MemberId == _dan.Id);
            var ruthsHall = listings.Single(listing => listing.MemberId == _ruth.Id);
            var sentByDan = Message.Send(ruthsHall, _dan.Id, "Is your hall free? Call me on 604-555-0199", new DateOnly(2026, 6, 13), new DateOnly(2026, 6, 14), LeftAt.AddDays(-1));
            var sentByJosh = Message.Send(ruthsHall, josh.Id, "Is it free on Friday?", null, null, LeftAt.AddDays(-1));
            database.AddRange(josh, sentByDan, sentByJosh, Message.Send(dansHall, _ruth.Id, "Could we borrow your hall?", null, null, LeftAt.AddDays(-2)));
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
            (fromDan, fromJosh) = (sentByDan.Id, sentByJosh.Id);
        }

        _clock.Advance(TimeSpan.FromDays(30));
        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        using var after = services.CreateScope();
        var messages = await after.ServiceProvider.GetRequiredService<AppDbContext>().Messages.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(2, messages.Count);
        var cleared = messages.Single(message => message.Id == fromDan);
        Assert.Equal(string.Empty, cleared.Text);
        Assert.Equal(new DateOnly(2026, 6, 13), cleared.StartDate);
        Assert.Equal("Is it free on Friday?", messages.Single(message => message.Id == fromJosh).Text);
    }

    // ADR 0025: what a departed member was to be told goes with them; another member's stays.
    [Fact]
    public async Task A_departed_members_notices_are_deleted()
    {
        await SeedAsync();
        using var services = Services(afterDays: null);
        using (var scope = services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            database.AddRange(
                MemberNotice.ListingRemoved(_dan.Id, Guid.NewGuid(), LeftAt.AddDays(-3)),
                MemberNotice.ListingRemoved(_ruth.Id, Guid.NewGuid(), LeftAt.AddDays(-3)));
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        _clock.Advance(TimeSpan.FromDays(30));
        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        using var after = services.CreateScope();
        var notices = await after.ServiceProvider.GetRequiredService<AppDbContext>().MemberNotices.AsNoTracking()
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal([_ruth.Id], notices.Select(notice => notice.MemberId));
    }

    // L2-021 criterion 13 (ADR 0023): the note of a departed member's report goes and the report
    // stays in the review queue; the reports about their listings are deleted with those
    // listings, and their review items with them; other reports stay as they were.
    [Fact]
    public async Task A_departed_members_report_notes_are_cleared_and_the_reports_about_their_listings_deleted()
    {
        await SeedAsync();
        using var services = Services(afterDays: null);
        var josh = Member.Create(Guid.NewGuid(), "Josh Patel", _grace.Id, isVerified: true, LeftAt.AddYears(-1), "josh-patel");
        Report byDan, byJosh, aboutDans;
        using (var scope = services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var listings = await database.Listings.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
            var dansHall = listings.Single(listing => listing.MemberId == _dan.Id);
            var ruthsHall = listings.Single(listing => listing.MemberId == _ruth.Id);
            byDan = Report.File(ruthsHall, _dan.Id, ReportReason.Scam, "Call me on 604-555-0199", LeftAt.AddDays(-1));
            byJosh = Report.File(ruthsHall, josh.Id, ReportReason.SomethingElse, "The price is wrong.", LeftAt.AddDays(-1));
            aboutDans = Report.File(dansHall, josh.Id, ReportReason.NotARealListing, null, LeftAt.AddDays(-1));
            database.AddRange(josh, byDan, byJosh, aboutDans);
            database.AddRange(new[] { byDan, byJosh, aboutDans }.Select(report => ReviewItem.ForReport(report.Id, report.CreatedAt)));
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        _clock.Advance(TimeSpan.FromDays(30));
        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        using var after = services.CreateScope();
        var store = after.ServiceProvider.GetRequiredService<AppDbContext>();
        var reports = await store.Reports.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(new[] { byDan.Id, byJosh.Id }.Order(), reports.Select(report => report.Id).Order());
        Assert.Null(reports.Single(report => report.Id == byDan.Id).Note);
        Assert.Equal("The price is wrong.", reports.Single(report => report.Id == byJosh.Id).Note);
        var items = await store.ReviewItems.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(new[] { byDan.Id, byJosh.Id }.Order(), items.Select(item => item.SubjectId).Order());
    }

    [Fact]
    public async Task Purging_again_changes_nothing()
    {
        await SeedAsync();
        using var services = Services(afterDays: null);
        _clock.Advance(TimeSpan.FromDays(31));
        await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        Assert.EndsWith("Anonymised 0 departed members and deleted 0 listings and 0 photos.", _output.ToString().TrimEnd(), StringComparison.Ordinal);
    }

    // Members:PurgeAfterDays shortens the wait; it is never longer than 30 days.
    [Theory]
    [InlineData(10, 10, 1)]
    [InlineData(10, 9, 0)]
    [InlineData(0, 0, 1)]
    public async Task The_wait_is_the_configured_number_of_days(int afterDays, int daysPassed, int anonymised)
    {
        await SeedAsync();
        using var services = Services(afterDays);
        _clock.Advance(TimeSpan.FromDays(daysPassed));

        Assert.Equal(0, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        Assert.Contains($"Anonymised {anonymised} departed members", _output.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_wait_longer_than_30_days_is_refused()
    {
        await SeedAsync();
        using var services = Services(afterDays: 31);

        Assert.Equal(1, await CliApp.RunAsync(["purge-departed"], services, _output, TestContext.Current.CancellationToken));

        Assert.Contains("Members:PurgeAfterDays", _output.ToString(), StringComparison.Ordinal);
        Assert.Equal("Pastor Dan Whitaker", (await MemberAsync(services, _dan.Id)).Name);
    }

    private ServiceProvider Services(int? afterDays)
    {
        var services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IPhotoStorage>(_photos)
            .AddSingleton<TimeProvider>(_clock)
            .AddApplication();
        if (afterDays is { } days)
        {
            services.Configure<MemberPurgeOptions>(options => options.PurgeAfterDays = days);
        }

        return services.BuildServiceProvider();
    }

    private async Task SeedAsync()
    {
        using var services = Services(afterDays: null);
        using var scope = services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        _dan.Depart(LeftAt);
        database.AddRange(_grace, _dan, _ruth, Hall(_dan, _dansPhoto), Hall(_ruth, _ruthsPhoto));
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        foreach (var photo in new[] { _dansPhoto, _ruthsPhoto })
        {
            foreach (var rendition in Renditions)
            {
                _photos.Files[$"{photo:N}/{rendition}.jpg"] = [0xFF, 0xD8, 0xFF, 0xD9];
            }
        }
    }

    private static Listing Hall(Member poster, Guid photoId)
    {
        var listing = Listing.Create(
            Guid.NewGuid(), poster.Id, ListingOffer.ForRent, ListingKind.Space, "A hall", new Price(45m, PricePeriod.Hour),
            "Weekdays", null, null, "Langley", null, LeftAt.AddDays(-10), [ListingPhoto.Create(photoId, 0, null)]);
        listing.Approve(LeftAt.AddDays(-9));
        return listing;
    }

    private static async Task<Member> MemberAsync(ServiceProvider services, Guid id)
    {
        using var scope = services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.AsNoTracking()
            .SingleAsync(member => member.Id == id, TestContext.Current.CancellationToken);
    }
}
