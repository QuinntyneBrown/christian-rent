using ChristianRent.Application;
using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// L2-014 criterion 7 (ADR 0021): <c>purge-photos</c> deletes every photo no posted listing
/// names once it is 24 hours old, its files first; a photo a listing names stays. Time is a fake
/// clock; nothing sleeps.
/// </summary>
public sealed class PurgePhotosTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);
    private static readonly string[] Renditions = ["card", "gallery", "thumb"];

    private readonly FakeTimeProvider _clock = new(Now);
    private readonly MemoryPhotoStorage _photos = new();
    private readonly string _databaseName = $"christian-rent-purge-photos-{Guid.NewGuid()}";
    private readonly Church _grace = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);
    private readonly Member _sarah;

    public PurgePhotosTests() =>
        _sarah = Member.Create(Guid.NewGuid(), "Sarah Kim", _grace.Id, isVerified: true, Now.AddYears(-1), "sarah-kim");

    [Fact]
    public async Task An_unattached_photo_is_deleted_once_it_is_24_hours_old_and_purging_again_changes_nothing()
    {
        using var services = Services();
        var listing = Listing.Create(
            Guid.NewGuid(), _sarah.Id, ListingOffer.ForRent, ListingKind.Thing, "Drill", new Price(5m, PricePeriod.Day),
            "Weekends", null, null, "Langley", null, Now.AddDays(-3));
        var old = Photo.Upload(Guid.NewGuid(), _sarah.Id, 800, 600, Now - TimeSpan.FromHours(24));
        var recent = Photo.Upload(Guid.NewGuid(), _sarah.Id, 800, 600, Now - TimeSpan.FromHours(24) + TimeSpan.FromMinutes(1));
        var posted = Photo.Upload(Guid.NewGuid(), _sarah.Id, 800, 600, Now.AddDays(-2));
        posted.AttachTo(listing.Id);
        await SeedAsync(services, listing, old, recent, posted);
        using var output = new StringWriter();

        Assert.Equal(0, await CliApp.RunAsync(["purge-photos"], services, output, TestContext.Current.CancellationToken));

        Assert.Contains("Deleted 1 unattached photos.", output.ToString(), StringComparison.Ordinal);
        Assert.Equal(new[] { recent.Id, posted.Id }.Order(), (await PhotoIdsAsync(services)).Order());
        Assert.All(Renditions, rendition => Assert.DoesNotContain($"{old.Id:N}/{rendition}.jpg", _photos.Files.Keys));
        Assert.All(Renditions, rendition => Assert.Contains($"{recent.Id:N}/{rendition}.jpg", _photos.Files.Keys));
        Assert.All(Renditions, rendition => Assert.Contains($"{posted.Id:N}/{rendition}.jpg", _photos.Files.Keys));

        Assert.Equal(0, await CliApp.RunAsync(["purge-photos"], services, output, TestContext.Current.CancellationToken));
        Assert.EndsWith("Deleted 0 unattached photos.", output.ToString().TrimEnd(), StringComparison.Ordinal);
    }

    private ServiceProvider Services() =>
        new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IPhotoStorage>(_photos)
            .AddSingleton<TimeProvider>(_clock)
            .AddApplication()
            .BuildServiceProvider();

    private async Task SeedAsync(ServiceProvider services, Listing listing, params Photo[] photos)
    {
        using var scope = services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        database.AddRange(_grace, _sarah, listing);
        database.AddRange(photos);
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        foreach (var photo in photos)
        {
            foreach (var rendition in Renditions)
            {
                _photos.Files[$"{photo.Id:N}/{rendition}.jpg"] = [0xFF, 0xD8, 0xFF, 0xD9];
            }
        }
    }

    private static async Task<List<Guid>> PhotoIdsAsync(ServiceProvider services)
    {
        using var scope = services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Select(photo => photo.Id).ToListAsync(TestContext.Current.CancellationToken);
    }
}
