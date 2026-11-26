namespace ChristianRent.Domain.Members;

/// <summary>
/// Someone who uses christian.rent and belongs to a church. A member starts unverified; an admin
/// confirms them (L2-018). The become-member journey adds how a member joins.
/// </summary>
public sealed class Member
{
    public const int MaxNameLength = 80;

    private Member(Guid id, string name, Guid churchId, bool isVerified, DateTimeOffset joinedAt)
    {
        Id = id;
        Name = name;
        ChurchId = churchId;
        IsVerified = isVerified;
        JoinedAt = joinedAt;
        Status = MemberStatus.Active;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public Guid ChurchId { get; private set; }

    public bool IsVerified { get; private set; }

    public MemberStatus Status { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>A member with a known identifier, as seed data and tests enter them.</summary>
    public static Member Create(Guid id, string name, Guid churchId, bool isVerified, DateTimeOffset joinedAt) =>
        new(id, name, churchId, isVerified, joinedAt);

    /// <summary>An admin removes the member; their listings stop being public.</summary>
    public void Remove() => Status = MemberStatus.Removed;
}
