using System.Buffers.Text;
using System.Globalization;
using System.Text;

namespace ChristianRent.Application.Listings;

/// <summary>
/// The position after the last listing of a page: its approval time and identifier, as an
/// opaque base64url string (ADR 0013).
/// </summary>
public readonly record struct ListingCursor(DateTimeOffset ApprovedAt, Guid Id)
{
    public string Encode() =>
        Base64Url.EncodeToString(Encoding.UTF8.GetBytes(
            $"{ApprovedAt.UtcTicks.ToString(CultureInfo.InvariantCulture)}:{Id:N}"));

    /// <summary>Reads a cursor this type encoded; anything else is refused.</summary>
    public static bool TryDecode(string text, out ListingCursor cursor)
    {
        cursor = default;
        if (text.Length is 0 or > 128 || !Base64Url.IsValid(text))
        {
            return false;
        }

        var parts = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(text)).Split(':');
        if (parts.Length != 2 ||
            !long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks) ||
            ticks < DateTimeOffset.MinValue.UtcTicks || ticks > DateTimeOffset.MaxValue.UtcTicks ||
            !Guid.TryParseExact(parts[1], "N", out var id))
        {
            return false;
        }

        cursor = new ListingCursor(new DateTimeOffset(ticks, TimeSpan.Zero), id);
        return true;
    }
}
