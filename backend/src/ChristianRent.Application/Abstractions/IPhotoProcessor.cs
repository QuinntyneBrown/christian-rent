namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Re-encodes an accepted photo as the renditions it is stored as (ADR 0011), without its
/// embedded metadata (L2-014, criterion 3; ADR 0021).
/// </summary>
public interface IPhotoProcessor
{
    /// <summary>One JPEG per rendition named in <c>PhotoRenditions.Sizes</c>, at that size.</summary>
    Task<IReadOnlyList<PhotoRendition>> ProcessAsync(byte[] content, CancellationToken cancellationToken);
}

/// <summary>A rendition's name (<c>card</c>, <c>gallery</c>, <c>thumb</c>) and its JPEG bytes.</summary>
public sealed record PhotoRendition(string Name, byte[] Content);
