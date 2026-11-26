namespace ChristianRent.Domain.Listings;

/// <summary>
/// The limits of a photo (L2-013, L2-014; ADR 0021). <see cref="Check"/> applies them in order,
/// first match wins, and answers the refusal's code or null: the length, before anything is
/// read; the format, by content; then the sides, either way round, so a photo taken upright is
/// held to the same limits as one taken sideways.
/// </summary>
public static class PhotoRules
{
    public const long MaxBytes = 10 * 1024 * 1024;
    public const int MinLongSide = 400;
    public const int MinShortSide = 300;
    public const int MaxSide = 8000;
    public const int MaxPerListing = 6;

    /// <summary>How long a photo no posted listing names is kept (ADR 0021).</summary>
    public static readonly TimeSpan KeepUnattached = TimeSpan.FromHours(24);

    public const string TooLarge = "photo_too_large";
    public const string TypeRefused = "photo_type_refused";
    public const string DimensionsTooLarge = "photo_dimensions_too_large";
    public const string TooSmall = "photo_too_small";

    /// <summary>The length alone, which is checked before the content is read.</summary>
    public static string? CheckLength(long length) => length > MaxBytes ? TooLarge : null;

    public static string? Check(long length, PhotoFacts? facts)
    {
        if (CheckLength(length) is { } tooLarge)
        {
            return tooLarge;
        }

        if (facts is null || facts.Format == PhotoFormat.Other)
        {
            return TypeRefused;
        }

        if (Math.Max(facts.Width, facts.Height) > MaxSide)
        {
            return DimensionsTooLarge;
        }

        return Math.Max(facts.Width, facts.Height) < MinLongSide || Math.Min(facts.Width, facts.Height) < MinShortSide
            ? TooSmall
            : null;
    }
}
