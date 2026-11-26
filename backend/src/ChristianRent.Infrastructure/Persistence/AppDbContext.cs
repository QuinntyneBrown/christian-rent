using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Church> Churches => Set<Church>();

    public DbSet<Member> Members => Set<Member>();

    public DbSet<Listing> Listings => Set<Listing>();

    public DbSet<Photo> Photos => Set<Photo>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<Report> Reports => Set<Report>();

    public DbSet<ReviewItem> ReviewItems => Set<ReviewItem>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // pg_trgm serves a search's Contains on listings."SearchText" (ADR 0015).
        modelBuilder.HasPostgresExtension("pg_trgm");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
