namespace ChristianRent.Application.Members;

/// <summary>
/// Who a member is, as the frontend's session needs it (become-member design): with their
/// church's name, which Post's preview shows (ADR 0019).
/// </summary>
public sealed record MemberDto(Guid Id, string Name, string ChurchName, bool IsVerified, bool IsAdmin);
