using System.Buffers.Text;
using System.Globalization;
using System.Text;

namespace ChristianRent.Application.Paging;

/// <summary>
/// The position after the last row of a page in a list ordered by an instant and an identifier,
/// as an opaque base64url string: a listing's approval time on Browse (ADR 0013), a review
/// item's creation time in the review queue.
/// </summary>
public readonly record struct KeysetCursor(DateTimeOffset At, Guid Id)
{
    public string Encode() =>
        Base64Url.EncodeToString(Encoding.UTF8.GetBytes(
            $"{At.UtcTicks.ToString(CultureInfo.InvariantCulture)}:{Id:N}"));

    /// <summary>Reads a cursor this type encoded; anything else is refused.</summary>
    public static bool TryDecode(string text, out KeysetCursor cursor)
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

        cursor = new KeysetCursor(new DateTimeOffset(ticks, TimeSpan.Zero), id);
        return true;
    }
}
