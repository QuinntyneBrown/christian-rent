namespace ChristianRent.Domain.Notices;

/// <summary>
/// That a member's listing was removed, kept to tell them once a way to reach them is designed
/// (L2-020, criteria 7 and 20; ADR 0025). It holds no words, and nothing that could name who
/// reported the listing (L2-021, criterion 4).
/// </summary>
public sealed class ListingRemovalNotice
{
    private ListingRemovalNotice(Guid id, Guid memberId, Guid listingId, DateTimeOffset createdAt)
    {
        Id = id;
        MemberId = memberId;
        ListingId = listingId;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    /// <summary>The member who posted the listing.</summary>
    public Guid MemberId { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>When the listing was removed.</summary>
    public DateTimeOffset CreatedAt { get; private set; }

    public static ListingRemovalNotice Record(Guid memberId, Guid listingId, DateTimeOffset now) =>
        new(Guid.NewGuid(), memberId, listingId, now);
}
