using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Seeding;

/// <summary>
/// The sample data of the mocks' cast (docs/mocks/README.md), for development and demonstration.
/// Seeding is idempotent: each row has a fixed identifier and is entered only when absent, and
/// each photo is written only when storage does not hold it. Each journey adds the rows its
/// screens need.
/// </summary>
public static class SampleData
{
    private static readonly Church Grace = Church.Create(Id("c4a7e1f0-0001"), "Grace Community Church", "Langley", isVerified: true);
    private static readonly Church Willoughby = Church.Create(Id("c4a7e1f0-0002"), "Willoughby Baptist", "Langley", isVerified: true);
    private static readonly Church Cornerstone = Church.Create(Id("c4a7e1f0-0003"), "Cornerstone Church", "Langley", isVerified: true);
    private static readonly Church NewSong = Church.Create(Id("c4a7e1f0-0004"), "New Song Fellowship", "Langley", isVerified: false);
    private static readonly Church StPauls = Church.Create(Id("c4a7e1f0-0005"), "St. Paul’s Anglican", "Fort Langley", isVerified: false);
    private static readonly Church ChristChurch = Church.Create(Id("c4a7e1f0-0006"), "Christ Church", "Abbotsford", isVerified: true);
    private static readonly Church Redeemer = Church.Create(Id("c4a7e1f0-0007"), "Redeemer Presbyterian", "Langley", isVerified: false);

    private static readonly DateTimeOffset Joined = new(2025, 4, 6, 18, 0, 0, TimeSpan.Zero);

    private static readonly Member Dan = Member.Create(Id("5a7a4c3e-0101"), "Pastor Dan Whitaker", Grace.Id, isVerified: true, Joined);
    private static readonly Member Moores = Member.Create(Id("5a7a4c3e-0102"), "Ruth and Caleb Moore", Willoughby.Id, isVerified: true, Joined);
    private static readonly Member Josh = Member.Create(Id("5a7a4c3e-0103"), "Josh Patel", Cornerstone.Id, isVerified: true, Joined);
    private static readonly Member Hannah = Member.Create(Id("5a7a4c3e-0104"), "Hannah Brooks", Grace.Id, isVerified: true, Joined);
    private static readonly Member Marcus = Member.Create(Id("5a7a4c3e-0105"), "Marcus Lee", NewSong.Id, isVerified: true, Joined);
    private static readonly Member Alicia = Member.Create(Id("5a7a4c3e-0106"), "Dr. Alicia Gomez", StPauls.Id, isVerified: false, Joined);
    private static readonly Member Emily = Member.Create(Id("5a7a4c3e-0107"), "Emily Carter", ChristChurch.Id, isVerified: true, Joined);
    private static readonly Member Okafors = Member.Create(Id("5a7a4c3e-0108"), "The Okafor family", Redeemer.Id, isVerified: false, Joined);

    public static IReadOnlyList<Church> Churches { get; } = [Grace, Willoughby, Cornerstone, NewSong, StPauls, ChristChurch, Redeemer];

    public static IReadOnlyList<Member> Members { get; } = [Dan, Moores, Josh, Hannah, Marcus, Alicia, Emily, Okafors];

    /// <summary>
    /// The photos of the listings for rent: each embedded file, and its description. The hall has
    /// the three photos of the Listing mock's gallery.
    /// </summary>
    private static readonly IReadOnlyList<SamplePhoto> Photos =
    [
        new(Id("9e0f0a10-0001"), "hall", "A bright hall with round tables, folding chairs and tall arched windows"),
        new(Id("9e0f0a10-0002"), "room", "A guest room with a made bed, a wooden desk and a window with a plant"),
        new(Id("9e0f0a10-0003"), "tools", "A red pressure washer and a cordless drill on a workbench under a pegboard of tools"),
        new(Id("9e0f0a10-0004"), "trailer", "A small white and turquoise camper trailer parked on grass under a tree"),
        new(Id("9e0f0a10-0005"), "hall-2", "Long tables with folding chairs under exposed beams, a cross on the far wall"),
        new(Id("9e0f0a10-0006"), "hall-3", "Round tables and folding chairs beside a row of tall arched windows"),
    ];

    /// <summary>The notes of the listings the Listing mocks show, as their members wrote them.</summary>
    private const string HallNote = "Our hall sits empty most of the week. Round tables, 80 chairs, a small kitchen and a coffee bar. Great for showers, small-group retreats and homeschool co-ops.";
    private const string VanNote = "Our youth group is taking 13 kids to camp in the Okanagan. We need a van with valid ICBC insurance. We’ll return it cleaner than we found it.";
    private const string OfficeNote = "Registered clinical counsellor looking for a private, quiet room with two chairs. A church office or a spare room in a ministry building would be perfect.";

    /// <summary>Browse's seven approved listings, the most recently approved first, and two waiting.</summary>
    public static IReadOnlyList<Listing> Listings() =>
    [
        Approved(ForRent(Id("1157a000-0002"), Moores, ListingKind.Space, "Quiet guest room, month to month", new Price(850m, PricePeriod.Month), "Available Jul 1, 2026", "Walnut Grove, Langley", null, Photos[1]), Day(7)),
        Approved(Wanted(Id("1157a000-0006"), Alicia, ListingKind.Space, "Small office for weekly counselling", new Price(300m, PricePeriod.Month), "Tuesdays and Thursdays", null, null, "Fort Langley", OfficeNote), Day(6)),
        Approved(Wanted(Id("1157a000-0005"), Marcus, ListingKind.Thing, "15-passenger van for youth camp", new Price(120m, PricePeriod.Day), null, new DateOnly(2026, 7, 14), new DateOnly(2026, 7, 18), "Murrayville, Langley", VanNote), Day(5)),
        Approved(ForRent(Id("1157a000-0001"), Dan, ListingKind.Space, "Sunlit fellowship hall for 80", new Price(45m, PricePeriod.Hour), "Weekdays and Saturdays", "Langley", HallNote, Photos[0], Photos[4], Photos[5]), Day(4)),
        Approved(Wanted(Id("1157a000-0007"), Emily, ListingKind.Thing, "120 white folding chairs", null, null, new DateOnly(2026, 8, 8), new DateOnly(2026, 8, 8), "Abbotsford"), Day(3)),
        Approved(ForRent(Id("1157a000-0003"), Josh, ListingKind.Thing, "Pressure washer and drill kit", new Price(25m, PricePeriod.Day), "Most weekends", "Willoughby, Langley", null, Photos[2]), Day(2)),
        Approved(ForRent(Id("1157a000-0004"), Hannah, ListingKind.Thing, "Vintage camper for mission trips", new Price(85m, PricePeriod.Day), "Spring through fall", "Aldergrove", null, Photos[3]), Day(1)),
        ForRent(Id("1157a000-0008"), Okafors, ListingKind.Space, "Backyard garden for gatherings", new Price(150m, PricePeriod.Day), "Summer weekends", "Langley", null),
        Wanted(Id("1157a000-0009"), Marcus, ListingKind.Space, "Storage locker for our food bank", null, "From September", null, null, "Langley"),
    ];

    /// <summary>
    /// What waits in the review queue, oldest first: the two waiting listings, and Dr. Alicia
    /// Gomez as a new member between them (docs/mocks/README.md).
    /// </summary>
    public static IReadOnlyList<ReviewItem> ReviewItems() =>
    [
        ReviewItem.Create(Id("4e71e700-0001"), ReviewItemKind.NewListing, Id("1157a000-0008"), Day(8, hour: 9)),
        ReviewItem.Create(Id("4e71e700-0002"), ReviewItemKind.NewMember, Alicia.Id, Day(8, hour: 11)),
        ReviewItem.Create(Id("4e71e700-0003"), ReviewItemKind.NewListing, Id("1157a000-0009"), Day(8, hour: 12)),
    ];

    /// <summary>Enters every sample row and photo that is not there yet, and says how many it entered.</summary>
    public static async Task<SeedCounts> SeedAsync(AppDbContext database, IPhotoStorage photos, CancellationToken cancellationToken)
    {
        var churches = await AddMissingAsync(database, database.Churches, Churches, church => church.Id, cancellationToken);
        var members = await AddMissingAsync(database, database.Members, Members, member => member.Id, cancellationToken);
        var listings = await AddMissingAsync(database, database.Listings, Listings(), listing => listing.Id, cancellationToken);
        var reviewItems = await AddMissingAsync(database, database.ReviewItems, ReviewItems(), item => item.Id, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);

        var written = 0;
        foreach (var photo in Photos)
        {
            var wrote = false;
            foreach (var (rendition, file) in Renditions(photo))
            {
                var key = PhotoRenditions.StorageKey(photo.Id, rendition);
                await using var existing = await photos.OpenReadAsync(key, cancellationToken);
                if (existing is not null)
                {
                    continue;
                }

                await using var content = typeof(SampleData).Assembly.GetManifestResourceStream($"ChristianRent.Infrastructure.Seeding.Photos.{file}")
                    ?? throw new InvalidOperationException($"The sample photo {file} is not embedded.");
                await photos.SaveAsync(key, content, cancellationToken);
                wrote = true;
            }

            written += wrote ? 1 : 0;
        }

        return new SeedCounts(churches, members, listings, written, reviewItems);
    }

    private static async Task<int> AddMissingAsync<T>(
        AppDbContext database, DbSet<T> set, IReadOnlyList<T> rows, Func<T, Guid> idOf, CancellationToken cancellationToken)
        where T : class
    {
        var ids = rows.Select(idOf).ToList();
        var present = (await set.AsNoTracking().Select(row => EF.Property<Guid>(row, "Id")).Where(id => ids.Contains(id)).ToListAsync(cancellationToken)).ToHashSet();
        var missing = rows.Where(row => !present.Contains(idOf(row))).ToList();
        database.AddRange(missing);
        return missing.Count;
    }

    private static Listing ForRent(Guid id, Member poster, ListingKind kind, string title, Price price, string when, string area, string? note, params SamplePhoto[] photos) =>
        Listing.Create(id, poster.Id, ListingOffer.ForRent, kind, title, price, when, null, null, area, note, Day(1, hour: 8),
            photos.Select((photo, position) => ListingPhoto.Create(photo.Id, position, photo.Description)));

    /// <summary>
    /// The file each rendition is written from (ADR 0011). The mocks' photos are 800 px wide, so the
    /// sample's gallery rendition is its card file; the thumb is made from it once, at 240 × 180.
    /// </summary>
    private static IEnumerable<(string Rendition, string File)> Renditions(SamplePhoto photo) =>
    [
        (PhotoRenditions.Card, $"{photo.File}.jpg"),
        (PhotoRenditions.Gallery, $"{photo.File}.jpg"),
        (PhotoRenditions.Thumb, $"{photo.File}.thumb.jpg"),
    ];

    private static Listing Wanted(Guid id, Member poster, ListingKind kind, string title, Price? price, string? when, DateOnly? start, DateOnly? end, string area, string? note = null) =>
        Listing.Create(id, poster.Id, ListingOffer.Wanted, kind, title, price, when, start, end, area, note, Day(1, hour: 8));

    private static Listing Approved(Listing listing, DateTimeOffset at)
    {
        listing.Approve(at);
        return listing;
    }

    private static DateTimeOffset Day(int day, int hour = 16) => new(2026, 6, day, hour, 0, 0, TimeSpan.Zero);

    private static Guid Id(string prefix) => Guid.Parse($"{prefix}-4000-8000-{prefix[^4..].PadLeft(12, '0')}");

    private sealed record SamplePhoto(Guid Id, string File, string Description);
}

/// <summary>How many rows and photos one run of the seed entered.</summary>
public sealed record SeedCounts(int Churches, int Members, int Listings, int Photos, int ReviewItems);
