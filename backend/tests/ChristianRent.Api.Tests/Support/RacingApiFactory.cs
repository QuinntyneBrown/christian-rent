using ChristianRent.Application.Abstractions;
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

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// The API whose handlers reach the database through an <see cref="IAppDbContext"/> that runs
/// <see cref="BeforeSave"/> before it saves, so a test injects a fault there (ADR 0007).
/// </summary>
public sealed class RacingApiFactory : ProbeApiFactory
{
    public Func<AppDbContext, Task>? BeforeSave { get; set; }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddScoped<IAppDbContext>(provider => new RacingDbContext(provider, this));
    }

    private sealed class RacingDbContext(IServiceProvider services, RacingApiFactory factory) : IAppDbContext
    {
        private AppDbContext Inner => services.GetRequiredService<AppDbContext>();

        public DbSet<Church> Churches => Inner.Churches;

        public DbSet<Member> Members => Inner.Members;

        public DbSet<Listing> Listings => Inner.Listings;

        public DbSet<Photo> Photos => Inner.Photos;

        public DbSet<Message> Messages => Inner.Messages;

        public DbSet<Report> Reports => Inner.Reports;

        public DbSet<ReviewItem> ReviewItems => Inner.ReviewItems;

        public DbSet<MemberNotice> MemberNotices => Inner.MemberNotices;

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            if (factory.BeforeSave is { } fault)
            {
                // The competing writer has its own unit of work.
                using var scope = factory.Services.CreateScope();
                await fault(scope.ServiceProvider.GetRequiredService<AppDbContext>());
            }

            return await Inner.SaveChangesAsync(cancellationToken);
        }

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => Inner.CanConnectAsync(cancellationToken);
    }
}
