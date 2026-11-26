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

    public CliTests()
    {
        var databaseName = $"christian-rent-cli-{Guid.NewGuid()}";
        _services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
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

    [Fact]
    public async Task Seeding_twice_changes_nothing()
    {
        await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);
        var first = await ChurchesAsync();

        var exitCode = await CliApp.RunAsync(["seed"], _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(0, exitCode);
        var second = await ChurchesAsync();
        Assert.Equal(first.Select(church => (church.Id, church.Name, church.City, church.IsVerified)), second.Select(church => (church.Id, church.Name, church.City, church.IsVerified)));
        Assert.Contains("Seeded 0 churches", _output.ToString(), StringComparison.Ordinal);
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
