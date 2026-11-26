using ChristianRent.Domain.Listings;

namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Identifies a photo from its content's header, never from its file name or declared type
/// (L2-014, criterion 1; ADR 0021).
/// </summary>
public interface IPhotoInspector
{
    /// <summary>The format and size the content's header gives, or null when it is not an image.</summary>
    PhotoFacts? Inspect(byte[] content);
}
