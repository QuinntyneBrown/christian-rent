using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Notices;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Identity;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Persistence;

/// <summary>
/// The one database: the product's tables, ASP.NET Core Identity's accounts, and the data
/// protection keys that protect the session cookies, so they survive a restart and a second
/// instance (ADR 0029).
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityUserContext<Account>(options), IAppDbContext, IDataProtectionKeyContext
{
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    public DbSet<Church> Churches => Set<Church>();

    public DbSet<Member> Members => Set<Member>();

    public DbSet<Listing> Listings => Set<Listing>();

    public DbSet<Photo> Photos => Set<Photo>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<Report> Reports => Set<Report>();

    public DbSet<ReviewItem> ReviewItems => Set<ReviewItem>();

    public DbSet<ListingRemovalNotice> ListingRemovalNotices => Set<ListingRemovalNotice>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // pg_trgm serves a search's Contains on listings."SearchText" (ADR 0015).
        builder.HasPostgresExtension("pg_trgm");
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
