using ChristianRent.Domain.Churches;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Seeding;

/// <summary>
/// The sample data of the mocks' cast (docs/mocks/README.md), for development and demonstration.
/// Seeding is idempotent: each row has a fixed identifier and is entered only when absent. Each
/// journey adds the rows its screens need.
/// </summary>
public static class SampleData
{
    public static IReadOnlyList<Church> Churches { get; } =
    [
        Church.Create(Guid.Parse("c4a7e1f0-0001-4000-8000-000000000001"), "Grace Community Church", "Langley", isVerified: true),
        Church.Create(Guid.Parse("c4a7e1f0-0002-4000-8000-000000000002"), "Willoughby Baptist", "Langley", isVerified: true),
        Church.Create(Guid.Parse("c4a7e1f0-0003-4000-8000-000000000003"), "Cornerstone Church", "Langley", isVerified: true),
        Church.Create(Guid.Parse("c4a7e1f0-0004-4000-8000-000000000004"), "New Song Fellowship", "Langley", isVerified: false),
        Church.Create(Guid.Parse("c4a7e1f0-0005-4000-8000-000000000005"), "St. Paul’s Anglican", "Fort Langley", isVerified: false),
        Church.Create(Guid.Parse("c4a7e1f0-0006-4000-8000-000000000006"), "Christ Church", "Abbotsford", isVerified: true),
        Church.Create(Guid.Parse("c4a7e1f0-0007-4000-8000-000000000007"), "Redeemer Presbyterian", "Langley", isVerified: false),
    ];

    /// <summary>Enters every sample row that is not there yet, and returns how many it entered.</summary>
    public static async Task<int> SeedAsync(AppDbContext database, CancellationToken cancellationToken)
    {
        var ids = Churches.Select(church => church.Id).ToList();
        var present = await database.Churches
            .Where(church => ids.Contains(church.Id))
            .Select(church => church.Id)
            .ToListAsync(cancellationToken);

        var missing = Churches
            .Where(church => !present.Contains(church.Id))
            .Select(church => Church.Create(church.Id, church.Name, church.City, church.IsVerified))
            .ToList();
        database.Churches.AddRange(missing);
        await database.SaveChangesAsync(cancellationToken);
        return missing.Count;
    }
}
