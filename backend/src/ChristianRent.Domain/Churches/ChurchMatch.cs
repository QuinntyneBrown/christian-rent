using ChristianRent.Domain.Listings;

namespace ChristianRent.Domain.Churches;

/// <summary>
/// When a new church is one that already exists (L2-017, criterion 15; ADR 0018): its name and
/// city are each trimmed, made single-spaced and normalised as a search is (lower case, no
/// accents; ADR 0015), and joined by a separator nobody types. Punctuation is kept.
/// </summary>
public static class ChurchMatch
{
    private const char Separator = '\u001F';

    /// <summary>The longest key: a name and a city at their limits, and the separator.</summary>
    public const int MaxKeyLength = Church.MaxNameLength + Church.MaxCityLength + 1;

    public static string KeyOf(string name, string city) => $"{Part(name)}{Separator}{Part(city)}";

    private static string Part(string text) =>
        string.Join(' ', SearchNormalizer.Normalize(text).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
