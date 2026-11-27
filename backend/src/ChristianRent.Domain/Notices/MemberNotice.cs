namespace ChristianRent.Domain.Notices;

/// <summary>
/// Something a member is to be told, recorded until the inbox that shows it is designed
/// (ADR 0025). A removed listing's notice names the listing and never who reported it
/// (L2-021, criterion 4).
/// </summary>
public sealed class MemberNotice
{
    private MemberNotice(Guid id, MemberNoticeKind kind, Guid memberId, Guid listingId, DateTimeOffset createdAt)
    {
        Id = id;
        Kind = kind;
        MemberId = memberId;
        ListingId = listingId;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public MemberNoticeKind Kind { get; private set; }

    /// <summary>The member to tell.</summary>
    public Guid MemberId { get; private set; }

    public Guid ListingId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The member who posted a listing is told that an admin removed it (L2-020, criterion 7).</summary>
    public static MemberNotice ListingRemoved(Guid memberId, Guid listingId, DateTimeOffset now) =>
        new(Guid.NewGuid(), MemberNoticeKind.ListingRemoved, memberId, listingId, now);
}
