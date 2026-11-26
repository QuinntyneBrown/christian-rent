using ChristianRent.Application;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using ChristianRent.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// L2-019 criterion 23 (ADR 0024): the operator makes a member an admin with
/// <c>grant-admin &lt;member-id&gt;</c>. The database is EF Core InMemory.
/// </summary>
public sealed class GrantAdminTests : IDisposable
{
    private static readonly DateTimeOffset Joined = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    private readonly StringWriter _output = new();
    private readonly ServiceProvider _services;
    private readonly Church _grace = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);
    private readonly Member _naomi;
    private readonly Member _gone;

    public GrantAdminTests()
    {
        _naomi = Member.Create(Guid.NewGuid(), "Naomi Friesen", _grace.Id, isVerified: true, Joined, "naomi-friesen");
        _gone = Member.Create(Guid.NewGuid(), "Gone Member", _grace.Id, isVerified: true, Joined, "gone-member");
        _gone.Depart(Joined.AddDays(1));
        var databaseName = $"christian-rent-admin-{Guid.NewGuid()}";
        _services = new ServiceCollection()
            .AddLogging()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
            .AddScoped<Application.Abstractions.IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton(TimeProvider.System)
            .AddApplication()
            .BuildServiceProvider();
    }

    public void Dispose()
    {
        _services.Dispose();
        _output.Dispose();
    }

    [Fact]
    public async Task Grant_admin_makes_the_member_an_admin_and_running_it_again_changes_nothing()
    {
        await SeedAsync();

        var first = await RunAsync("grant-admin", _naomi.Id.ToString());
        var second = await RunAsync("grant-admin", _naomi.Id.ToString());

        Assert.Equal((0, 0), (first, second));
        Assert.True((await MemberAsync(_naomi.Id)).IsAdmin);
        Assert.Contains($"Member {_naomi.Id} is an admin.", _output.ToString(), StringComparison.Ordinal);
        // What the command writes names nobody (L2-028, criterion 3).
        Assert.DoesNotContain("Naomi", _output.ToString(), StringComparison.Ordinal);
    }

    // One case per row: who cannot be made an admin.
    [Theory]
    [InlineData("departed")]
    [InlineData("unknown")]
    [InlineData("nonsense")]
    public async Task Grant_admin_refuses_anyone_who_is_not_an_active_member(string who)
    {
        await SeedAsync();
        var id = who switch
        {
            "departed" => _gone.Id.ToString(),
            "unknown" => Guid.NewGuid().ToString(),
            _ => "nonsense",
        };

        var exitCode = await RunAsync("grant-admin", id);

        Assert.Equal(1, exitCode);
        Assert.Contains("No active member has that identifier.", _output.ToString(), StringComparison.Ordinal);
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await database.Members.AnyAsync(member => member.IsAdmin, TestContext.Current.CancellationToken));
    }

    // The sample data makes nobody an admin, and puts what waits in it into the review queue.
    [Fact]
    public async Task Seed_puts_the_waiting_cast_in_the_review_queue_once_and_makes_nobody_an_admin()
    {
        using var photos = new SeededServices();

        await CliApp.RunAsync(["seed"], photos.Provider, _output, TestContext.Current.CancellationToken);
        await CliApp.RunAsync(["seed"], photos.Provider, _output, TestContext.Current.CancellationToken);

        using var scope = photos.Provider.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var items = await database.ReviewItems.OrderBy(item => item.CreatedAt).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal([ReviewItemKind.NewListing, ReviewItemKind.NewMember, ReviewItemKind.NewListing], items.Select(item => item.Kind));
        Assert.Equal(SampleData.ReviewItems().Select(item => item.Id), items.Select(item => item.Id));
        Assert.False(await database.Members.AnyAsync(member => member.IsAdmin, TestContext.Current.CancellationToken));
        Assert.Contains("and 3 review items.", _output.ToString(), StringComparison.Ordinal);
        Assert.Contains("0 photos and 0 review items.", _output.ToString(), StringComparison.Ordinal);
    }

    private Task<int> RunAsync(params string[] args) =>
        CliApp.RunAsync(args, _services, _output, TestContext.Current.CancellationToken);

    private async Task SeedAsync()
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        database.AddRange(_grace, _naomi, _gone);
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<Member> MemberAsync(Guid id)
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.Members.AsNoTracking().SingleAsync(member => member.Id == id, TestContext.Current.CancellationToken);
    }

    private sealed class SeededServices : IDisposable
    {
        public SeededServices()
        {
            var databaseName = $"christian-rent-seed-queue-{Guid.NewGuid()}";
            Provider = new ServiceCollection()
                .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
                .AddSingleton<Application.Abstractions.IPhotoStorage>(new MemoryPhotoStorage())
                .BuildServiceProvider();
        }

        public ServiceProvider Provider { get; }

        public void Dispose() => Provider.Dispose();
    }
}
