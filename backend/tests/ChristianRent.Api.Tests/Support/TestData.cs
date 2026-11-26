using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Rows a test enters through the API's own database before it calls the API. The cast is the
/// mocks' (docs/mocks/README.md); its names are data, not rules.
/// </summary>
public static class TestData
{
    public static readonly Church Grace = Church.Create(Guid.Parse("c4a7e1f0-0001-4000-8000-000000000001"), "Grace Community Church", "Langley", isVerified: true);
    public static readonly Church NewSong = Church.Create(Guid.Parse("c4a7e1f0-0004-4000-8000-000000000004"), "New Song Fellowship", "Langley", isVerified: false);

    public static Member Member(string name, Church church, Guid? id = null) =>
        Domain.Members.Member.Create(id ?? Guid.NewGuid(), name, church.Id, isVerified: true, new DateTimeOffset(2026, 1, 5, 9, 0, 0, TimeSpan.Zero));

    /// <summary>A listing for rent with one photo, approved at <paramref name="approvedAt"/> when given.</summary>
    public static Listing ForRent(Member poster, string title, DateTimeOffset? approvedAt, Price? price = null, string area = "Langley", Guid? photoId = null)
    {
        var listing = Listing.Create(
            Guid.NewGuid(), poster.Id, ListingOffer.ForRent, ListingKind.Space, title,
            price ?? new Price(45m, PricePeriod.Hour), "Weekdays and Saturdays", null, null, area, null,
            new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero),
            [ListingPhoto.Create(photoId ?? Guid.NewGuid(), 0, "A bright hall with round tables"), ListingPhoto.Create(Guid.NewGuid(), 1, null)]);
        if (approvedAt is { } at)
        {
            listing.Approve(at);
        }

        return listing;
    }

    /// <summary>A wanted listing with no photo and dates, approved at <paramref name="approvedAt"/> when given.</summary>
    public static Listing Wanted(Member poster, string title, DateTimeOffset? approvedAt, Price? price = null)
    {
        var listing = Listing.Create(
            Guid.NewGuid(), poster.Id, ListingOffer.Wanted, ListingKind.Thing, title, price, null,
            new DateOnly(2026, 7, 14), new DateOnly(2026, 7, 18), "Murrayville, Langley", null,
            new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero));
        if (approvedAt is { } at)
        {
            listing.Approve(at);
        }

        return listing;
    }

    /// <summary>
    /// An approved listing with the offer, kind and words a search reads (search-and-filter
    /// design): its title, note and area.
    /// </summary>
    public static Listing Approved(Member poster, ListingOffer offer, ListingKind kind, string title, DateTimeOffset approvedAt, string? note = null, string area = "Langley")
    {
        var listing = Listing.Create(
            Guid.NewGuid(), poster.Id, offer, kind, title, null, "Weekdays", null, null, area, note,
            new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero));
        listing.Approve(approvedAt);
        return listing;
    }

    /// <summary>Enters the rows in the factory's in-memory store.</summary>
    public static async Task SeedAsync(this ApiFactory factory, params object[] rows)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        database.AddRange(rows);
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    public static DateTimeOffset At(int day, int hour = 9) => new(2026, 6, day, hour, 0, 0, TimeSpan.Zero);
}
