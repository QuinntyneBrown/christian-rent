using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using SkiaSharp;

namespace ChristianRent.Infrastructure.Photos;

/// <summary>
/// Makes the renditions with Skia (ADR 0011, ADR 0021): the first frame is decoded, turned
/// upright from its EXIF orientation, cropped from the centre to fill each 4:3 box on white, and
/// encoded as a JPEG at quality 82. Skia writes no metadata, so the EXIF block with its GPS
/// position and every other embedded profile are left behind (L2-014, criterion 3). A photo
/// up to 8,000 px a side decodes to about 256 MB, so at most 2 are processed at a time.
/// </summary>
public sealed class SkiaPhotoProcessor : IPhotoProcessor, IDisposable
{
    public const int Quality = 82;
    public const int MaxConcurrent = 2;

    private readonly SemaphoreSlim _slots = new(MaxConcurrent, MaxConcurrent);

    public async Task<IReadOnlyList<PhotoRendition>> ProcessAsync(byte[] content, CancellationToken cancellationToken)
    {
        await _slots.WaitAsync(cancellationToken);
        try
        {
            return Process(content);
        }
        finally
        {
            _slots.Release();
        }
    }

    public void Dispose() => _slots.Dispose();

    private static List<PhotoRendition> Process(byte[] content)
    {
        using var data = SKData.CreateCopy(content);
        using var codec = SKCodec.Create(data) ?? throw new InvalidOperationException("The photo cannot be decoded.");
        var info = new SKImageInfo(codec.Info.Width, codec.Info.Height, SKColorType.Rgba8888, SKAlphaType.Premul);
        using var decoded = new SKBitmap(info);
        var result = codec.GetPixels(info, decoded.GetPixels());
        if (result is not (SKCodecResult.Success or SKCodecResult.IncompleteInput))
        {
            throw new InvalidOperationException($"The photo cannot be decoded: {result}.");
        }

        using var upright = Upright(decoded, codec.EncodedOrigin);
        using var image = SKImage.FromBitmap(upright);
        var renditions = new List<PhotoRendition>(PhotoRenditions.Sizes.Count);
        foreach (var (name, (width, height)) in PhotoRenditions.Sizes)
        {
            renditions.Add(new PhotoRendition(name, Render(image, width, height)));
        }

        return renditions;
    }

    /// <summary>The image cropped from its centre to fill the box, then scaled to it.</summary>
    private static byte[] Render(SKImage image, int width, int height)
    {
        var scale = Math.Max((float)width / image.Width, (float)height / image.Height);
        var cropWidth = width / scale;
        var cropHeight = height / scale;
        var source = SKRect.Create((image.Width - cropWidth) / 2, (image.Height - cropHeight) / 2, cropWidth, cropHeight);

        using var surface = SKSurface.Create(new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.White);
        using var paint = new SKPaint();
        canvas.DrawImage(image, source, SKRect.Create(width, height), new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear), paint);
        using var snapshot = surface.Snapshot();
        using var encoded = snapshot.Encode(SKEncodedImageFormat.Jpeg, Quality);
        return encoded.ToArray();
    }

    /// <summary>A copy of the bitmap as it is meant to be seen, by its EXIF orientation.</summary>
    private static SKBitmap Upright(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        var swap = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var upright = new SKBitmap(swap ? bitmap.Height : bitmap.Width, swap ? bitmap.Width : bitmap.Height, bitmap.ColorType, bitmap.AlphaType);
        using var canvas = new SKCanvas(upright);
        switch (origin)
        {
            case SKEncodedOrigin.TopRight:
                canvas.Translate(upright.Width, 0);
                canvas.Scale(-1, 1);
                break;
            case SKEncodedOrigin.BottomRight:
                canvas.Translate(upright.Width, upright.Height);
                canvas.RotateDegrees(180);
                break;
            case SKEncodedOrigin.BottomLeft:
                canvas.Translate(0, upright.Height);
                canvas.Scale(1, -1);
                break;
            case SKEncodedOrigin.LeftTop:
                canvas.RotateDegrees(90);
                canvas.Scale(1, -1);
                break;
            case SKEncodedOrigin.RightTop:
                canvas.Translate(upright.Width, 0);
                canvas.RotateDegrees(90);
                break;
            case SKEncodedOrigin.RightBottom:
                canvas.Translate(upright.Width, upright.Height);
                canvas.RotateDegrees(90);
                canvas.Scale(-1, 1);
                break;
            case SKEncodedOrigin.LeftBottom:
                canvas.Translate(0, upright.Height);
                canvas.RotateDegrees(270);
                break;
        }

        using var image = SKImage.FromBitmap(bitmap);
        canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKFilterMode.Nearest));
        return upright;
    }
}
