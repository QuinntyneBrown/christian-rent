namespace ChristianRent.Application.Listings;

/// <summary>The renditions every photo is stored as, each a 4:3 JPEG (ADR 0011).</summary>
public static class PhotoRenditions
{
    public const string Card = "card";
    public const string Gallery = "gallery";
    public const string Thumb = "thumb";

    public static readonly IReadOnlyDictionary<string, (int Width, int Height)> Sizes =
        new Dictionary<string, (int Width, int Height)>(StringComparer.Ordinal)
        {
            [Card] = (800, 600),
            [Gallery] = (1600, 1200),
            [Thumb] = (240, 180),
        };

    /// <summary>Where a rendition is kept in file storage.</summary>
    public static string StorageKey(Guid photoId, string rendition) => $"{photoId:N}/{rendition}.jpg";

    /// <summary>The address the API serves a rendition at.</summary>
    public static string Url(Guid photoId, string rendition) => $"/api/photos/{photoId}/{rendition}";

    /// <summary>The same rendition on Admin's own path, read with the Admin session (ADR 0029).</summary>
    public static string AdminUrl(Guid photoId, string rendition) => $"/api/admin/photos/{photoId}/{rendition}";
}
