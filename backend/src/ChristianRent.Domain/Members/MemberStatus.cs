namespace ChristianRent.Domain.Members;

/// <summary>Whether a member takes part. A removed member's listings are not public (L2-020).</summary>
public enum MemberStatus
{
    Active,
    Removed,
}
