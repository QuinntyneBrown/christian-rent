namespace ChristianRent.Domain.Listings;

/// <summary>The formats a photo's content can be identified as; only three are accepted.</summary>
public enum PhotoFormat
{
    Other,
    Jpeg,
    Png,
    WebP,
}

/// <summary>What a photo's header says it is: its format and its size in pixels (L2-014).</summary>
public sealed record PhotoFacts(PhotoFormat Format, int Width, int Height);
