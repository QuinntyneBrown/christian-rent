using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Listings;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// L2-034 criterion 3 and AGENTS.md: the schema and the seed data are applied by commands, never by
/// the API as it starts, and seed data is idempotent. The database is EF Core InMemory.
/// </summary>
public sealed class CliTests : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly StringWriter _output = new();
    private readonly MemoryPhotoStorage _photos = new();

    public CliTests()
    {
        var databaseName = $"christian-rent-cli-{Guid.NewGuid()}";
        _services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
            .AddSingleton<IPhotoStorage>(_photos)
            .BuildServiceProvider();
    }

    public void Dispose()
    {
        _services.Dispose();
        _output.Dispose();
    }

    [Fact]
    [Trait("Category", "Critical")]
    public async Task Seed_enters_the_sample_churches()
    {
        var exitCode = await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(0, exitCode);
        var churches = await ChurchesAsync();
        Assert.Contains(churches, church => church.Name == "Grace Community Church" && church.City == "Langley" && church.IsVerified);
        Assert.Contains(churches, church => church.Name == "St. Paul’s Anglican" && church.City == "Fort Langley" && !church.IsVerified);
        Assert.Contains("Seeded 7 churches", _output.ToString(), StringComparison.Ordinal);
    }

    // Browse (journey 2): the seven approved listings of the mocks, two waiting in the review
    // queue, the members who posted them, and the card photo of each listing for rent.
    [Fact]
    public async Task Seed_enters_the_cast_of_Browse()
    {
        await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);

        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var approved = await database.Listings.AsNoTracking()
            .Where(listing => listing.Status == ListingStatus.Approved)
            .OrderByDescending(listing => listing.ApprovedAt)
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["Quiet guest room, month to month", "Small office for weekly counselling", "15-passenger van for youth camp",
             "Sunlit fellowship hall for 80", "120 white folding chairs", "Pressure washer and drill kit", "Vintage camper for mission trips"],
            approved.Select(listing => listing.Title));
        Assert.Equal(2, await database.Listings.CountAsync(listing => listing.Status == ListingStatus.WaitingForReview, TestContext.Current.CancellationToken));
        Assert.Contains(await database.Members.ToListAsync(TestContext.Current.CancellationToken), member => member.Name == "Pastor Dan Whitaker");
        var cardKeys = approved
            .Where(listing => listing.Offer == ListingOffer.ForRent)
            .Select(listing => $"{listing.Photos[0].PhotoId:N}/card.jpg");
        Assert.All(cardKeys, key => Assert.True(_photos.Files.TryGetValue(key, out var bytes) && bytes is [0xFF, 0xD8, ..]));
        Assert.Contains("Seeded 7 churches, 8 members, 9 listings and 4 photos.", _output.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Seeding_twice_changes_nothing()
    {
        await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);
        var first = await ChurchesAsync();

        var exitCode = await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(0, exitCode);
        var second = await ChurchesAsync();
        Assert.Equal(first.Select(church => (church.Id, church.Name, church.City, church.IsVerified)), second.Select(church => (church.Id, church.Name, church.City, church.IsVerified)));
        Assert.Contains("Seeded 0 churches, 0 members, 0 listings and 0 photos.", _output.ToString(), StringComparison.Ordinal);
        Assert.Equal(4, _photos.Saves);
    }

    [Theory]
    [InlineData]
    [InlineData("drop-database")]
    public async Task An_unknown_command_is_refused_with_the_usage(params string[] args)
    {
        var exitCode = await CliApp.RunAsync(args, _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(2, exitCode);
        Assert.Contains("Usage: ChristianRent.Cli <migrate|seed>", _output.ToString(), StringComparison.Ordinal);
    }

    private async Task<List<Domain.Churches.Church>> ChurchesAsync()
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.Churches.AsNoTracking().OrderBy(church => church.Name).ToListAsync(TestContext.Current.CancellationToken);
    }
}
