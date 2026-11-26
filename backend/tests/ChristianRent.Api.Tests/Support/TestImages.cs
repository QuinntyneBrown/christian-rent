using System.Buffers.Binary;
using System.Net.Http.Headers;
using SkiaSharp;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Files a test uploads, made in memory at the size and in the format it names. A JPEG can
/// carry an EXIF block with a GPS position, as a phone writes it, so a test can prove it is
/// removed (L2-014, criterion 3).
/// </summary>
public static class TestImages
{
    /// <summary>The bytes that open an EXIF block in a JPEG's APP1 segment.</summary>
    public static readonly byte[] ExifMarker = "Exif\0\0"u8.ToArray();

    /// <summary>A 1 × 1 GIF: an image, but not a JPEG, PNG or WebP.</summary>
    public static readonly byte[] Gif = Convert.FromBase64String("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");

    public static byte[] Jpeg(int width = 1200, int height = 900, bool withGps = false)
    {
        var jpeg = Encode(width, height, SKEncodedImageFormat.Jpeg);
        return withGps ? WithExif(jpeg) : jpeg;
    }

    public static byte[] Png(int width = 1200, int height = 900) => Encode(width, height, SKEncodedImageFormat.Png);

    public static byte[] Webp(int width = 1200, int height = 900) => Encode(width, height, SKEncodedImageFormat.Webp);

    /// <summary>One multipart field, <c>file</c>, as the browser sends a chosen file.</summary>
    public static MultipartFormDataContent Form(byte[] bytes, string fileName = "garage.jpg", string contentType = "image/jpeg")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    /// <summary>The format and the size the content says it has, read from its header.</summary>
    public static (SKEncodedImageFormat Format, int Width, int Height) Identify(byte[] bytes)
    {
        using var codec = SKCodec.Create(new MemoryStream(bytes));
        return (codec.EncodedFormat, codec.Info.Width, codec.Info.Height);
    }

    /// <summary>Whether the bytes hold an EXIF block anywhere.</summary>
    public static bool HasExif(byte[] bytes) => bytes.AsSpan().IndexOf(ExifMarker) >= 0;

    private static byte[] Encode(int width, int height, SKEncodedImageFormat format)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            using var paint = new SKPaint
            {
                Shader = SKShader.CreateLinearGradient(
                    new SKPoint(0, 0), new SKPoint(width, height), [SKColors.SteelBlue, SKColors.Orange], SKShaderTileMode.Clamp),
            };
            canvas.DrawRect(0, 0, width, height, paint);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(format, 90);
        return data.ToArray();
    }

    /// <summary>
    /// The JPEG with an APP1 segment after its start marker holding a little-endian TIFF block
    /// whose GPS directory gives a latitude of 49° 6′ 15″ N.
    /// </summary>
    private static byte[] WithExif(byte[] jpeg)
    {
        var tiff = new byte[80];
        var span = tiff.AsSpan();
        "II"u8.CopyTo(span);
        BinaryPrimitives.WriteUInt16LittleEndian(span[2..], 42);
        BinaryPrimitives.WriteUInt32LittleEndian(span[4..], 8);
        // IFD0: one entry, GPSInfo (0x8825), pointing at the GPS directory at 26.
        BinaryPrimitives.WriteUInt16LittleEndian(span[8..], 1);
        Entry(span[10..], 0x8825, 4, 1, 26);
        // GPS directory: GPSLatitudeRef "N" and GPSLatitude, three rationals at 56.
        BinaryPrimitives.WriteUInt16LittleEndian(span[26..], 2);
        Entry(span[28..], 0x0001, 2, 2, 'N');
        Entry(span[40..], 0x0002, 5, 3, 56);
        uint[] latitude = [49, 1, 6, 1, 15, 1];
        for (var i = 0; i < latitude.Length; i++)
        {
            BinaryPrimitives.WriteUInt32LittleEndian(span[(56 + (i * 4))..], latitude[i]);
        }

        var segmentLength = 2 + ExifMarker.Length + tiff.Length;
        var app1 = new byte[2 + segmentLength];
        app1[0] = 0xFF;
        app1[1] = 0xE1;
        BinaryPrimitives.WriteUInt16BigEndian(app1.AsSpan(2), (ushort)segmentLength);
        ExifMarker.CopyTo(app1, 4);
        tiff.CopyTo(app1, 4 + ExifMarker.Length);
        return [.. jpeg[..2], .. app1, .. jpeg[2..]];
    }

    private static void Entry(Span<byte> entry, ushort tag, ushort type, uint count, uint value)
    {
        BinaryPrimitives.WriteUInt16LittleEndian(entry, tag);
        BinaryPrimitives.WriteUInt16LittleEndian(entry[2..], type);
        BinaryPrimitives.WriteUInt32LittleEndian(entry[4..], count);
        BinaryPrimitives.WriteUInt32LittleEndian(entry[8..], value);
    }
}
