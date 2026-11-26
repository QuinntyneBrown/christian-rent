using ChristianRent.Application.Listings;

namespace ChristianRent.Api.Tests;

/// <summary>ADR 0013: a cursor decodes only when the API encoded it.</summary>
public sealed class ListingCursorTests
{
    [Fact]
    public void A_cursor_decodes_to_what_was_encoded()
    {
        var cursor = new ListingCursor(new DateTimeOffset(2026, 6, 8, 15, 30, 12, 345, TimeSpan.Zero), Guid.NewGuid());

        Assert.True(ListingCursor.TryDecode(cursor.Encode(), out var decoded));
        Assert.Equal(cursor, decoded);
    }

    // One case per row: what is not a cursor.
    [Theory]
    [InlineData("")]
    [InlineData("not base64url!")]
    [InlineData("bm8tY29sb24")]
    [InlineData("MTIzOm5vdC1hLWd1aWQ")]
    [InlineData("LTE6MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA")]
    [InlineData("OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTowMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA")]
    public void Anything_else_does_not_decode(string text)
    {
        Assert.False(ListingCursor.TryDecode(text, out _));
    }
}
