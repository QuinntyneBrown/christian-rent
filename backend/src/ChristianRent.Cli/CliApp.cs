using ChristianRent.Application.Abstractions;
using ChristianRent.Infrastructure.Persistence;
using ChristianRent.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Cli;

/// <summary>
/// The commands an operator runs (fail-clearly-and-operate design). Deployment runs
/// <c>migrate</c> before the new API takes traffic; the API never migrates (L2-034, criterion 3).
/// </summary>
public static class CliApp
{
    public const string Usage = """
        Usage: ChristianRent.Cli <migrate|seed>
          migrate  Apply the pending EF Core migrations to the database in ConnectionStrings:Default.
          seed     Enter the sample data of the mocks' cast and its photos. Safe to run again: it changes nothing twice.
        """;

    public static async Task<int> RunAsync(string[] args, IServiceProvider services, TextWriter output, CancellationToken cancellationToken)
    {
        using var scope = services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        switch (args)
        {
            case ["migrate"]:
                var pending = (await database.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
                await database.Database.MigrateAsync(cancellationToken);
                await output.WriteLineAsync($"Applied {pending.Count} migrations.");
                return 0;

            case ["seed"]:
                var photos = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();
                var entered = await SampleData.SeedAsync(database, photos, cancellationToken);
                await output.WriteLineAsync(
                    $"Seeded {entered.Churches} churches, {entered.Members} members, {entered.Listings} listings and {entered.Photos} photos.");
                return 0;

            default:
                await output.WriteLineAsync(Usage);
                return 2;
        }
    }
}
