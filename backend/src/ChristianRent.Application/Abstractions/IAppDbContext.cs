using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Abstractions;

/// <summary>
/// The unit of work every handler uses. All access is LINQ through these sets; no handler builds
/// SQL from strings (L2-026, criterion 2). Tests inject database faults through this interface.
/// </summary>
public interface IAppDbContext
{
    DbSet<Church> Churches { get; }

    DbSet<Member> Members { get; }

    DbSet<Listing> Listings { get; }

    DbSet<ReviewItem> ReviewItems { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    /// <summary>Whether the database answers, for the readiness check (L2-034, criterion 1).</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken);
}
