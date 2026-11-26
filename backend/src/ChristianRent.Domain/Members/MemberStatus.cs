namespace ChristianRent.Domain.Members;

/// <summary>
/// Whether a member takes part. A removed member's listings are not public (L2-020), nor are a
/// departed member's, who asked to leave (L2-028, criterion 2).
/// </summary>
public enum MemberStatus
{
    Active,
    Removed,
    Departed,
}
