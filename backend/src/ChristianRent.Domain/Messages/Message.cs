using ChristianRent.Domain.Listings;

namespace ChristianRent.Domain.Messages;

/// <summary>
/// What a member sends about one listing to the member who posted it, with dates when the
/// listing is for rent (send-message design). It is private to the two of them (L2-016,
/// criterion 1) and changes nothing on the listing (L2-024, criterion 3). Until the Messages
/// inbox is designed it is stored and shown to nobody (ADR 0022).
/// </summary>
public sealed class Message
{
    public const int MaxTextLength = 1000;

    private Message(Guid id, Guid listingId, Guid senderId, Guid recipientId, string text, DateTimeOffset sentAt)
    {
        Id = id;
        ListingId = listingId;
        SenderId = senderId;
        RecipientId = recipientId;
        Text = text;
        SentAt = sentAt;
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public Guid SenderId { get; private set; }

    /// <summary>The member who posted the listing.</summary>
    public Guid RecipientId { get; private set; }

    /// <summary>What the sender wrote, as text; empty once the sender has left (ADR 0022).</summary>
    public string Text { get; private set; }

    public DateOnly? StartDate { get; private set; }

    public DateOnly? EndDate { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    /// <summary>
    /// A member sends a message about a listing to the member who posted it. The command's
    /// validator and handler have checked the text, the dates and who is sending.
    /// </summary>
    public static Message Send(Listing listing, Guid senderId, string text, DateOnly? startDate, DateOnly? endDate, DateTimeOffset now) =>
        new(Guid.NewGuid(), listing.Id, senderId, listing.MemberId, text, now)
        {
            StartDate = startDate,
            EndDate = endDate,
        };

    /// <summary>Only the member who sent it and the member who posted the listing may read it.</summary>
    public bool CanBeReadBy(Guid memberId) => memberId == SenderId || memberId == RecipientId;

    /// <summary>Its sender has left: what they wrote goes, and the message keeps its place.</summary>
    public void ClearText() => Text = string.Empty;
}
