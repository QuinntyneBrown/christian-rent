using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Listings;
using SkiaSharp;

namespace ChristianRent.Infrastructure.Photos;

/// <summary>
/// Reads a photo's header with Skia's codecs, without decoding its pixels (ADR 0021). The size
/// is as stored, before any EXIF orientation is applied.
/// </summary>
public sealed class SkiaPhotoInspector : IPhotoInspector
{
    public PhotoFacts? Inspect(byte[] content)
    {
        if (content.Length == 0)
        {
            return null;
        }

        using var data = SKData.CreateCopy(content);
        using var codec = SKCodec.Create(data);
        if (codec is null)
        {
            return null;
        }

        var format = codec.EncodedFormat switch
        {
            SKEncodedImageFormat.Jpeg => PhotoFormat.Jpeg,
            SKEncodedImageFormat.Png => PhotoFormat.Png,
            SKEncodedImageFormat.Webp => PhotoFormat.WebP,
            _ => PhotoFormat.Other,
        };
        return new PhotoFacts(format, codec.Info.Width, codec.Info.Height);
    }
}
