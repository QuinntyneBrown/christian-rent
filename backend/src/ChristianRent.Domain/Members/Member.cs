namespace ChristianRent.Domain.Members;

/// <summary>
/// Someone who uses christian.rent and belongs to a church. A member joins unverified and an
/// admin confirms them (L2-017, L2-018). Only the name, the church and the sign-in identifier are
/// kept about the person (L2-028, criterion 1; ADR 0017).
/// </summary>
public sealed class Member
{
    public const int MaxNameLength = 60;
    public const int MaxSignInIdLength = 200;

    private Member(Guid id, string? signInId, string name, Guid churchId, bool isVerified, DateTimeOffset joinedAt)
    {
        Id = id;
        SignInId = signInId;
        Name = name;
        ChurchId = churchId;
        IsVerified = isVerified;
        JoinedAt = joinedAt;
        Status = MemberStatus.Active;
    }

    public Guid Id { get; private set; }

    /// <summary>
    /// Who signs in as this member: the <c>sub</c> of the signed-in person (ADR 0017). Null once
    /// the member has left, and for seed data nobody signs in as.
    /// </summary>
    public string? SignInId { get; private set; }

    public string Name { get; private set; }

    public Guid ChurchId { get; private set; }

    public bool IsVerified { get; private set; }

    public bool IsAdmin { get; private set; }

    public MemberStatus Status { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>When the member asked to leave; the purge counts from it (L2-028, criterion 2).</summary>
    public DateTimeOffset? DepartedAt { get; private set; }

    /// <summary>A member with a known identifier, as seed data and tests enter them.</summary>
    public static Member Create(Guid id, string name, Guid churchId, bool isVerified, DateTimeOffset joinedAt, string? signInId = null) =>
        new(id, signInId, name, churchId, isVerified, joinedAt);

    /// <summary>A person joins: a member who is not verified yet (L2-017, criterion 3).</summary>
    public static Member Join(string signInId, string name, Guid churchId, DateTimeOffset now) =>
        new(Guid.NewGuid(), signInId, name, churchId, isVerified: false, now);

    /// <summary>When the purge made the departed member anonymous; null until then.</summary>
    public DateTimeOffset? AnonymizedAt { get; private set; }

    /// <summary>
    /// An operator makes the member an admin with <c>grant-admin</c>; nothing else does
    /// (ADR 0024).
    /// </summary>
    public void GrantAdmin() => IsAdmin = true;

    /// <summary>An admin removes the member; their listings stop being public.</summary>
    public void Remove() => Status = MemberStatus.Removed;

    /// <summary>An admin approved the member: their verified mark shows (L2-018, criterion 1).</summary>
    public void Verify() => IsVerified = true;

    /// <summary>
    /// The member asks to leave: their listings stop being public at once, and the sign-in is no
    /// longer this member (L2-028, criterion 2; ADR 0017).
    /// </summary>
    public void Depart(DateTimeOffset now)
    {
        Status = MemberStatus.Departed;
        DepartedAt = now;
        SignInId = null;
    }

    /// <summary>
    /// The purge replaces what identifies a departed member (L2-028, criterion 2): the name
    /// becomes <see cref="FormerMemberName"/>, and the sign-in is already gone.
    /// </summary>
    public void Anonymize(DateTimeOffset now)
    {
        Name = FormerMemberName;
        SignInId = null;
        AnonymizedAt = now;
    }

    public const string FormerMemberName = "Former member";
}
