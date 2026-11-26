using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Members;
using ChristianRent.Application.Photos;
using ChristianRent.Infrastructure.Persistence;
using ChristianRent.Infrastructure.Seeding;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ChristianRent.Cli;

/// <summary>
/// The commands an operator runs (fail-clearly-and-operate design). Deployment runs
/// <c>migrate</c> before the new API takes traffic; the API never migrates (L2-034, criterion 3).
/// </summary>
public static class CliApp
{
    public const string Usage = """
        Usage: ChristianRent.Cli <migrate|seed|purge-departed|purge-photos>
          migrate         Apply the pending EF Core migrations to the database in ConnectionStrings:Default.
          seed            Enter the sample data of the mocks' cast and its photos. Safe to run again: it changes nothing twice.
          purge-departed  Make members who left Members:PurgeAfterDays (at most 30) days ago anonymous, and delete
                          their listings and photos. Run it daily. Safe to run again: it changes nothing twice.
          purge-photos    Delete the photos no posted listing names that were uploaded 24 hours ago or more, and
                          their files. Run it hourly. Safe to run again: it changes nothing twice.
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

            case ["purge-departed"]:
                var days = scope.ServiceProvider.GetService<IOptions<MemberPurgeOptions>>()?.Value.PurgeAfterDays ?? MemberPurgeOptions.MaxDays;
                try
                {
                    var purged = await scope.ServiceProvider.GetRequiredService<ISender>()
                        .Send(new PurgeDepartedMembersCommand(days), cancellationToken);
                    await output.WriteLineAsync(
                        $"Anonymised {purged.Members} departed members and deleted {purged.Listings} listings and {purged.Photos} photos.");
                    return 0;
                }
                catch (ValidationException refused)
                {
                    await output.WriteLineAsync(string.Join(Environment.NewLine, refused.Errors.Select(error => error.ErrorMessage)));
                    return 1;
                }

            case ["purge-photos"]:
                var deleted = await scope.ServiceProvider.GetRequiredService<ISender>()
                    .Send(new PurgeUnattachedPhotosCommand(), cancellationToken);
                await output.WriteLineAsync($"Deleted {deleted} unattached photos.");
                return 0;

            default:
                await output.WriteLineAsync(Usage);
                return 2;
        }
    }
}
